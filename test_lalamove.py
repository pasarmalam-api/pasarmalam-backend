import copy
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import io
import json
import unittest
from unittest.mock import MagicMock as Mock, patch
from urllib.error import HTTPError, URLError

import lalamove
import server


ENV = {"LALAMOVE_ENV": "sandbox", "LALAMOVE_API_KEY": "pk_test_example",
       "LALAMOVE_API_SECRET": "sk_test_example"}
CITIES = [{"locode": "MY KUL", "services": [{"key": "MOTORCYCLE"}]}]


def request():
    return {"city": "MY KUL", "service_type": "MOTORCYCLE", "mode": "express",
            "pickup": {"address": "Test pickup", "coordinates": {"lat": 3.15, "lng": 101.71}},
            "dropoff": {"address": "Test destination", "coordinates": {"lat": 3.14, "lng": 101.69}}}


def quote():
    return {"quotationId": "1234567890123456789", "priceBreakdown": {"total": "8.5", "currency": "MYR"},
            "expiresAt": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()}


class LalamoveTest(unittest.TestCase):
    def test_signature_uses_exact_bytes(self):
        body = '{"data":{"address":"Jalan Test"}}'
        expected = hmac.new(b'secret', ('123\r\nPOST\r\n/v3/quotations\r\n\r\n' + body).encode(), hashlib.sha256).hexdigest()
        self.assertEqual(lalamove.signature('secret', '123', 'POST', '/v3/quotations', body), expected)

    def test_missing_mismatched_or_invalid_environment(self):
        for env in ({}, {**ENV, 'LALAMOVE_ENV': 'production'}, {**ENV, 'LALAMOVE_ENV': 'https://evil.invalid'}):
            with self.subTest(env=env), self.assertRaises(lalamove.LalamoveError):
                lalamove.Client(env)

    def test_http_request_headers_and_no_booking(self):
        opener = Mock()
        opener.open.return_value.__enter__.return_value.read.return_value = json.dumps({'data': CITIES}).encode()
        client = lalamove.Client(ENV, opener)
        self.assertEqual(client.cities(), CITIES)
        req = opener.open.call_args.args[0]
        self.assertEqual(req.full_url, 'https://rest.sandbox.lalamove.com/v3/cities')
        self.assertIsNone(req.data)
        self.assertEqual(req.get_header('Market'), 'MY')
        self.assertTrue(req.get_header('Authorization').startswith('hmac pk_test_example:'))
        self.assertTrue(req.get_header('Request-id'))
        self.assertEqual(opener.open.call_args.kwargs['timeout'], 20)
        with self.assertRaises(lalamove.LalamoveError):
            client._request('POST', '/v3/orders', {})
        self.assertEqual(opener.open.call_count, 1)

    def test_redirect_blocked(self):
        with self.assertRaises(lalamove.LalamoveError):
            lalamove.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://evil.invalid')

    def test_errors_do_not_expose_credentials_or_provider_body(self):
        for error in (HTTPError('https://example.invalid', 401, 'SECRET', {}, io.BytesIO(b'SECRET')),
                      URLError('SECRET'), TimeoutError('SECRET')):
            opener = Mock()
            opener.open.side_effect = error
            with self.subTest(error=type(error)), self.assertRaises(lalamove.LalamoveError) as caught:
                lalamove.Client(ENV, opener).cities()
            self.assertNotIn('SECRET', str(caught.exception))

    def test_invalid_json_and_oversized_responses(self):
        for body in (b'not json', b'[]', b'{}', b'x' * 2_000_001, b'{"data":{}}'):
            opener = Mock()
            opener.open.return_value.__enter__.return_value.read.return_value = body
            with self.subTest(size=len(body)), self.assertRaises(lalamove.LalamoveError):
                lalamove.Client(ENV, opener).cities()

    def test_express_and_standard_payloads(self):
        payload = lalamove.quotation_payload(request())['data']
        self.assertNotIn('scheduleAt', payload)
        self.assertNotIn('priorityFee', payload)
        self.assertNotIn('specialRequests', payload)
        self.assertEqual(payload['language'], 'en_MY')
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        payload = lalamove.quotation_payload({**request(), 'mode': 'standard', 'schedule_at': tomorrow.isoformat()})['data']
        self.assertTrue(payload['scheduleAt'].endswith('Z'))

    def test_schedule_validation(self):
        for value in (None, '', 'tomorrow', '2026-09-01T12:00:00',
                      (datetime.now(timezone.utc)-timedelta(minutes=1)).isoformat(),
                      (datetime.now(timezone.utc)+timedelta(days=31)).isoformat()):
            with self.subTest(value=value), self.assertRaises(ValueError):
                lalamove.quotation_payload({**request(), 'mode': 'standard', 'schedule_at': value})
        with self.assertRaises(ValueError):
            lalamove.quotation_payload({**request(), 'schedule_at': 'tomorrow'})

    def test_pooling_not_enabled(self):
        with self.assertRaises(ValueError):
            lalamove.quotation_payload({**request(), 'mode': 'pooling', 'perishable': False})

    def test_coordinates_and_addresses(self):
        for value in (None, '', True, float('nan'), float('inf'), 91, -91):
            data = request()
            data['pickup']['coordinates']['lat'] = value
            with self.subTest(value=value), self.assertRaises(ValueError):
                lalamove.quotation_payload(data)
        data = request()
        data['dropoff'] = copy.deepcopy(data['pickup'])
        with self.assertRaises(ValueError):
            lalamove.quotation_payload(data)
        data['pickup']['address'] = ''
        with self.assertRaises(ValueError):
            lalamove.quotation_payload(data)

    def test_quote_uses_available_vehicle_and_actual_total(self):
        client = lalamove.Client(ENV)
        with patch.object(client, '_request', side_effect=[CITIES, quote()]) as call:
            result = client.quote(request())
        self.assertEqual(result['priceBreakdown']['total'], '8.5')
        self.assertEqual(call.call_args.args[:2], ('POST', '/v3/quotations'))
        with patch.object(client, '_request', return_value=CITIES) as call:
            with self.assertRaises(ValueError):
                client.quote({**request(), 'service_type': 'NOT_AVAILABLE'})
        self.assertEqual(call.call_count, 1)

    def test_rejects_bad_or_expired_prices(self):
        for changes in ({'priceBreakdown': {'total':'NaN','currency':'MYR'}},
                        {'priceBreakdown': {'total':'-1','currency':'MYR'}},
                        {'priceBreakdown': {'total':'8','currency':'USD'}},
                        {'expiresAt': '2000-01-01T00:00:00Z'}, {'quotationId': ''},
                        {'expiresAt': '2026-12-01T00:00:00'}):
            client = lalamove.Client(ENV)
            with self.subTest(changes=changes), patch.object(client, '_request', side_effect=[CITIES, {**quote(), **changes}]):
                with self.assertRaises(lalamove.LalamoveError):
                    client.quote(request())

    def test_admin_endpoints_require_admin(self):
        handler = object.__new__(server.Handler)
        for user in (None, {'id': 1, 'role': 'buyer'}, {'id': 2, 'role': 'seller'}):
            handler.current_user = lambda: user
            with patch.object(server, 'LalamoveClient') as client:
                for action in (handler.admin_lalamove_cities, lambda: handler.admin_lalamove_quotation(request())):
                    with self.subTest(user=user), self.assertRaises(PermissionError):
                        action()
                client.assert_not_called()

    def test_admin_diagnostic_never_enables_checkout(self):
        handler = object.__new__(server.Handler)
        handler.current_user = lambda: {'id': 3, 'role': 'admin'}
        with patch.object(server, 'LalamoveClient') as client, patch.object(server, 'send_json') as send:
            client.return_value.quote.return_value = quote()
            handler.admin_lalamove_quotation(request())
            self.assertFalse(send.call_args.args[2]['booking_enabled'])
            self.assertFalse(send.call_args.args[2]['checkout_enabled'])
            client.side_effect = lalamove.LalamoveError('Not configured')
            handler.admin_lalamove_cities()
            self.assertEqual(send.call_args.args[1], 503)


if __name__ == '__main__':
    unittest.main()
