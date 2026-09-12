"""Server-only Lalamove quotations. This client deliberately cannot book orders."""

from datetime import datetime, timezone, timedelta
from decimal import Decimal, InvalidOperation
import hashlib
import hmac
import json
import math
import os
import time
import urllib.error
import urllib.request
import uuid


class LalamoveError(Exception):
    """A safe, public-facing error that never contains credentials or addresses."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise LalamoveError("Lalamove returned an unexpected redirect.")


def signature(secret, timestamp, method, path, body):
    message = f"{timestamp}\r\n{method}\r\n{path}\r\n\r\n{body}"
    return hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()


def waypoint(value):
    if not isinstance(value, dict):
        raise ValueError("A pickup and delivery location are required.")
    address = str(value.get("address") or "").strip()
    if not address or len(address) > 1000:
        raise ValueError("Provide a complete address (up to 1000 characters).")
    coordinates = value.get("coordinates")
    if not isinstance(coordinates, dict):
        raise ValueError("Confirm latitude and longitude for each address.")
    normalized = {}
    for name, limit in (("lat", 90), ("lng", 180)):
        raw = coordinates.get(name)
        try:
            number = float(raw)
        except (TypeError, ValueError):
            raise ValueError("Invalid location coordinates.") from None
        if isinstance(raw, bool) or not math.isfinite(number) or abs(number) > limit:
            raise ValueError("Invalid location coordinates.")
        normalized[name] = str(number)
    return {"address": address, "coordinates": normalized}


def quotation_payload(data, now=None):
    if not isinstance(data, dict):
        raise ValueError("Invalid quotation request.")
    mode = data.get("mode")
    if mode not in ("express", "standard"):
        raise ValueError("Choose express or standard delivery. Pooling is not enabled.")
    service = str(data.get("service_type") or "").strip()
    if not service or len(service) > 100:
        raise ValueError("Select a service returned by Lalamove city information.")
    payload = {
        "serviceType": service,
        "language": "en_MY",
        "stops": [waypoint(data.get("pickup")), waypoint(data.get("dropoff"))],
    }
    if payload["stops"][0]["coordinates"] == payload["stops"][1]["coordinates"]:
        raise ValueError("Pickup and delivery locations must be different.")
    schedule = data.get("schedule_at")
    if mode == "standard":
        try:
            scheduled = datetime.fromisoformat(str(schedule).replace("Z", "+00:00"))
        except ValueError:
            raise ValueError("Standard delivery requires a scheduled pickup time.") from None
        if scheduled.tzinfo is None:
            raise ValueError("Scheduled pickup must include a timezone.")
        now = now or datetime.now(timezone.utc)
        if not now < scheduled <= now + timedelta(days=30):
            raise ValueError("Schedule pickup in the future, within 30 days.")
        payload["scheduleAt"] = scheduled.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    elif schedule:
        raise ValueError("Express delivery uses immediate pickup, without a schedule.")
    return {"data": payload}


class Client:
    def __init__(self, env=None, opener=None):
        env = os.environ if env is None else env
        self.mode = env.get("LALAMOVE_ENV", "sandbox")
        if self.mode not in ("sandbox", "production"):
            raise LalamoveError("LALAMOVE_ENV must be sandbox or production.")
        self.key = env.get("LALAMOVE_API_KEY", "").strip()
        self.secret = env.get("LALAMOVE_API_SECRET", "").strip()
        prefix = "prod" if self.mode == "production" else "test"
        if not self.key.startswith(f"pk_{prefix}_") or not self.secret.startswith(f"sk_{prefix}_"):
            raise LalamoveError("Lalamove credentials are missing or do not match the environment.")
        self.base_url = "https://rest.lalamove.com" if self.mode == "production" else "https://rest.sandbox.lalamove.com"
        self.opener = opener or urllib.request.build_opener(NoRedirect())

    def _request(self, method, path, payload=None):
        if (method, path) not in (("GET", "/v3/cities"), ("POST", "/v3/quotations")):
            raise LalamoveError("Only city information and quotations are enabled.")
        body = "" if payload is None else json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        timestamp = str(int(time.time() * 1000))
        request_id = str(uuid.uuid4())
        headers = {
            "Authorization": f"hmac {self.key}:{timestamp}:{signature(self.secret, timestamp, method, path, body)}",
            "Market": "MY", "Request-ID": request_id, "Content-Type": "application/json",
        }
        req = urllib.request.Request(self.base_url + path, data=body.encode() if payload is not None else None,
                                     headers=headers, method=method)
        try:
            with self.opener.open(req, timeout=20) as response:
                raw = response.read(2_000_001)
                if len(raw) > 2_000_000:
                    raise LalamoveError("Lalamove response exceeded the size limit.")
                result = json.loads(raw)
        except urllib.error.HTTPError as exc:
            # Never propagate the provider body, request headers, or raw exception.
            raise LalamoveError(f"Lalamove returned HTTP {exc.code}. Reference: {request_id}") from None
        except (urllib.error.URLError, TimeoutError, OSError):
            raise LalamoveError(f"Cannot reach Lalamove. Try again. Reference: {request_id}") from None
        except (ValueError, UnicodeError):
            raise LalamoveError("Lalamove returned an invalid response.") from None
        if not isinstance(result, dict) or "data" not in result:
            raise LalamoveError("Lalamove returned an incomplete response.")
        return result["data"]

    def cities(self):
        cities = self._request("GET", "/v3/cities")
        if not isinstance(cities, list):
            raise LalamoveError("Lalamove returned invalid city information.")
        return cities

    def quote(self, data):
        payload = quotation_payload(data)
        cities = self.cities()
        city = next((item for item in cities if str(item.get("locode")) == str(data.get("city"))), None)
        if not city or not any(item.get("key") == payload["data"]["serviceType"] for item in city.get("services", [])):
            raise ValueError("Select an available Lalamove city and vehicle service.")
        quote = self._request("POST", "/v3/quotations", payload)
        try:
            price = Decimal(str(quote["priceBreakdown"]["total"]))
            currency = quote["priceBreakdown"]["currency"]
            expiry = datetime.fromisoformat(quote["expiresAt"].replace("Z", "+00:00"))
            valid = (price.is_finite() and price >= 0 and currency == "MYR" and
                     expiry.tzinfo is not None and expiry > datetime.now(timezone.utc) and
                     isinstance(quote["quotationId"], str) and bool(quote["quotationId"]))
        except (KeyError, TypeError, ValueError, InvalidOperation):
            valid = False
        if not valid:
            raise LalamoveError("Lalamove returned an invalid or expired MYR quotation.")
        return quote
