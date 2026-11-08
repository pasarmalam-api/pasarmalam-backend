"""Fail-closed COD pilot policy. Approved phones must be verified by operations."""
import json
import math
import os
import re


def phone(value):
    digits = re.sub(r'\D', '', str(value or ''))
    return '6' + digits if digits.startswith('0') else digits


def eligibility(con, user, product, data, total, environ=None):
    env = os.environ if environ is None else environ
    def deny(reason):
        return {'eligible': False, 'reason': reason}
    if product['selling_mode'] in ('bulk', 'factory'):
        return deny('Bulk and factory orders require Public Bank transfer.')
    if data.get('logistics_method') != 'PM Express':
        return deny('COD is available with PM Express riders only.')
    if env.get('PM_COD_ENABLED', '').lower() != 'true':
        return deny('COD is not currently available. Choose online payment.')
    try:
        limit = float(env.get('PM_COD_MAX_TOTAL', '0'))
        areas = json.loads(env.get('PM_COD_AREAS', '[]'))
        approved = json.loads(env.get('PM_COD_VERIFIED_BUYERS', '{}'))
        if not math.isfinite(limit) or limit <= 0 or not isinstance(approved, dict):
            raise ValueError()
        if not isinstance(areas, list) or not areas:
            raise ValueError()
        for box in areas:
            if (len(box) != 4 or not all(math.isfinite(float(v)) for v in box)
                    or not -90 <= float(box[0]) <= float(box[2]) <= 90
                    or not -180 <= float(box[1]) <= float(box[3]) <= 180):
                raise ValueError()
    except (ValueError, TypeError, OverflowError):
        return deny('COD configuration is incomplete. Choose online payment.')
    if not math.isfinite(total) or total <= 0 or total > limit:
        return deny(f'COD order limit including delivery is RM{limit:.2f}.')
    verified = phone(approved.get(str(user['id'])))
    if (not re.fullmatch(r'60\d{8,10}', verified)
            or phone(user.get('phone')) != verified
            or phone(data.get('buyer_phone')) != verified):
        return deny('COD requires a phone number verified by our team.')
    if not str(data.get('address') or '').strip():
        return deny('A complete delivery address is required for COD.')
    try:
        coordinates = data.get('coordinates') or {}
        lat, lng = float(coordinates['lat']), float(coordinates['lng'])
        if data.get('location_confirmed') is not True or not any(
                float(s) <= lat <= float(n) and float(w) <= lng <= float(e)
                for s, w, n, e in areas):
            return deny('This address is outside our COD delivery area.')
    except (KeyError, TypeError, ValueError, OverflowError):
        return deny('Confirm your delivery location to check COD availability.')
    history = con.execute("""SELECT id FROM orders WHERE buyer_id=?
        AND payment_method='Pay on Arrival' AND payment_status<>'paid' LIMIT 1""",
        (user['id'],)).fetchone()
    if history:
        return deny('COD is unavailable while a previous COD order is unpaid or cancelled. Contact support.')
    completed = con.execute("""SELECT id FROM orders WHERE buyer_id=?
        AND payment_status='paid' AND order_status IN ('completed','delivered') LIMIT 1""",
        (user['id'],)).fetchone()
    if not completed:
        return deny('Complete a prepaid order before using COD.')
    return {'eligible': True, 'reason': 'Pay cash to the PM rider on delivery.', 'max_total': limit}
