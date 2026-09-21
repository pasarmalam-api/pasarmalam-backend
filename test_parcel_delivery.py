import json
import unittest
from unittest.mock import patch

import delivery
import parcel_delivery
import server
from test_delivery import DeliveryTest


class ParcelDeliveryTest(unittest.TestCase):
    def setUp(self):
        DeliveryTest.setUp(self)
        self.product['category'] = 'Chargers'
        self.point['address'] = 'Shop 1, 10150 Penang, Malaysia'
        self.data.update(logistics_method='EasyParcel', address='Office, 11950 Penang, Malaysia',
                         location_confirmed=False, package_confirmed=False, coordinates={})
        with server.connect() as con:
            delivery.save_pickup(con, 2, self.point)
        self.rates = [{'courier': {'service_id': 'A', 'service_name': 'Courier A'},
                       'pricing': {'total_amount': '8.00', 'currency': 'MYR'}},
                      {'courier': {'service_id': 'B', 'service_name': 'Courier B'},
                       'pricing': {'total_amount': '5.00', 'currency': 'MYR'}}]

    def offers(self):
        with server.connect() as con, patch.object(parcel_delivery, 'request_rates', return_value=self.rates):
            return delivery.create_quote(con, self.user, self.product, 1, self.data)['offers']

    def test_parcel_rates_and_consumption(self):
        offers = self.offers()
        self.assertEqual([o['fee'] for o in offers], [5.4, 8.4])
        data = {**self.data, 'quote_id': offers[0]['quote_id'], 'logistics_fee': 0}
        with server.connect() as con:
            fee, details = delivery.consume(con, self.user, self.product, 1, data)
        self.assertEqual(fee, 5.4)
        self.assertEqual(details['provider'], 'easyparcel')
        self.assertEqual(details['quotation']['courier']['service_id'], 'B')
        self.assertEqual(details['dispatch_status'], 'manual_booking_required')
        with server.connect() as con, self.assertRaises(ValueError):
            delivery.consume(con, self.user, self.product, 1, data)

    def test_parcel_route_change_rejected(self):
        data = {**self.data, 'quote_id': self.offers()[0]['quote_id'], 'address': 'Other, 10150 Penang'}
        with server.connect() as con, self.assertRaises(ValueError):
            delivery.consume(con, self.user, self.product, 1, data)

    def test_parcel_no_cash_on_arrival(self):
        with self.assertRaises(ValueError):
            self.handler.checkout({**self.data, 'payment_method': 'Pay on Arrival'})

    def test_parcel_food_rejected(self):
        self.product['category'] = 'Food'
        with self.assertRaises(ValueError):
            self.offers()

    def test_parcel_missing_postcode(self):
        self.data['address'] = 'Penang'
        with self.assertRaises(ValueError):
            self.offers()

    def test_parcel_invalid_rates(self):
        self.rates[0]['pricing']['total_amount'] = 'NaN'
        self.rates[1]['pricing']['currency'] = 'SGD'
        with self.assertRaises(ValueError):
            self.offers()

    def test_parcel_request_format(self):
        import easyparcel
        import time
        from unittest.mock import MagicMock
        with patch.dict('os.environ', {'EASYPARCEL_CLIENT_ID': 'test', 'EASYPARCEL_CLIENT_SECRET': 'test'}):
            with server.connect() as con:
                easyparcel.migrate(con)
                con.execute('INSERT INTO easyparcel_connection VALUES(?,?,?,?,?)',
                    ('platform', easyparcel.cipher().encrypt(json.dumps({'access_token': 'test-token'}).encode()).decode(), 0, int(time.time())+600, 3))
                response = MagicMock()
                response.__enter__.return_value.read.return_value = json.dumps({'data': [{'status': 'success', 'quotations': self.rates}]}).encode()
                with patch('urllib.request.OpenerDirector.open', return_value=response) as call:
                    result = parcel_delivery.request_rates(con, {'weight': .5})
                request = call.call_args.args[0]
                self.assertTrue(request.full_url.endswith('/shipment/quotations'))
                self.assertEqual(json.loads(request.data), {'shipment': [{'weight': .5}]})
                self.assertEqual(result, self.rates)

    def test_parcel_token_refresh(self):
        import easyparcel
        import time
        from unittest.mock import MagicMock
        with patch.dict('os.environ', {'EASYPARCEL_CLIENT_ID': 'test', 'EASYPARCEL_CLIENT_SECRET': 'test'}):
            with server.connect() as con:
                easyparcel.migrate(con)
                con.execute('INSERT INTO easyparcel_connection VALUES(?,?,?,?,?)',
                    ('platform', easyparcel.cipher().encrypt(json.dumps({'access_token': 'old', 'refresh_token': 'refresh'}).encode()).decode(), 0, 1, 3))
            response = MagicMock()
            response.__enter__.return_value.read.return_value = json.dumps({'access_token': 'new', 'refresh_token': 'rotated', 'expires_in': 3600, 'token_type': 'Bearer'}).encode()
            with patch('urllib.request.OpenerDirector.open', return_value=response) as call:
                easyparcel.refresh_if_needed(server.connect)
                easyparcel.refresh_if_needed(server.connect)
                self.assertEqual(call.call_count, 1)
                self.assertIn(b'grant_type=refresh_token', call.call_args.args[0].data)
            with server.connect() as con:
                row = con.execute("SELECT * FROM easyparcel_connection WHERE id='platform'").fetchone()
            self.assertGreater(row['expires_at'], time.time())
            self.assertEqual(json.loads(easyparcel.cipher().decrypt(row['encrypted_tokens'].encode()))['refresh_token'], 'rotated')


if __name__ == '__main__':
    import unittest
    unittest.main()
