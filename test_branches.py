import copy
from datetime import datetime, timedelta, timezone
import json
import os
import tempfile
import unittest
from unittest.mock import Mock, patch

import branches
import delivery
import server


class BranchTest(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        settings = patch.multiple(server, DB_PATH=os.path.join(folder.name, 'test.db'), USE_POSTGRES=False)
        settings.start(); self.addCleanup(settings.stop)
        server.init_db()
        self.seller = {'id': 2, 'role': 'seller'}
        self.buyer = {'id': 1, 'role': 'buyer', 'name': 'Buyer', 'phone': '01123456789'}
        self.handler = object.__new__(server.Handler)
        self.handler.current_user = lambda: self.seller
        self.form = {'name': 'KL Branch', 'phone': '01123456789', 'address': 'Suria KLCC, Kuala Lumpur, Malaysia',
                     'coordinates': {'lat': 3.158, 'lng': 101.712}, 'confirmed': True,
                     'is_open': True, 'active': True, 'prices': {'1': '25.50'}}
        with server.connect() as con:
            con.execute("UPDATE users SET seller_status='approved',status='active',shop_open=1 WHERE id=2")
            con.execute('UPDATE products SET seller_id=2,price=20,stock=5,weight_kg=0.5 WHERE id=1')
            self.ident = branches.save(con, 2, self.form)
            self.product = dict(con.execute('SELECT * FROM products WHERE id=1').fetchone())
        self.data = {'branch_id': self.ident, 'expected_unit_price': 25.5, 'product_id': 1, 'quantity': 1,
                     'fee_version': 1, 'logistics_method': 'PM Express', 'payment_method': 'Pay on Arrival',
                     'address': 'KL Sentral, Malaysia', 'buyer_phone': '01123456789',
                     'coordinates': {'lat': 3.134, 'lng': 101.686}, 'location_confirmed': True,
                     'package_confirmed': True, 'city': 'MY KUL', 'service_type': 'MOTORCYCLE'}
        self.client = Mock()
        self.client.cities.return_value = [{'locode': 'MY KUL', 'services': [{'key': 'MOTORCYCLE', 'load': {'value': '10', 'unit': 'kg'}}]}]
        self.client.quote.return_value = {'quotationId': 'mock', 'priceBreakdown': {'total': '9', 'currency': 'MYR'},
                                         'expiresAt': (datetime.now(timezone.utc)+timedelta(minutes=5)).isoformat()}

    def quote(self, data=None):
        data = data or self.data
        with server.connect() as con:
            product, qty, *_ = self.handler.validate_checkout_payload(con, data, self.buyer)
            return {**data, 'quote_id': delivery.create_quote(con, self.buyer, product, qty, data, self.client)['quote_id']}

    def test_shared_inventory_and_price_inheritance(self):
        with server.connect() as con:
            before = con.execute('SELECT COUNT(*) AS n FROM products').fetchone()['n']
            second = branches.save(con, 2, {**self.form, 'name': 'Second', 'prices': {}})
            self.assertEqual(branches.resolve(con, self.product, second)['price'], 20)
            self.assertEqual(branches.resolve(con, self.product, self.ident)['price'], 25.5)
            con.execute('UPDATE products SET price=22,stock=3 WHERE id=1')
            product = dict(con.execute('SELECT * FROM products WHERE id=1').fetchone())
            self.assertEqual(branches.resolve(con, product, second)['price'], 22)
            self.assertEqual(branches.resolve(con, product, self.ident)['price'], 25.5)
            self.assertEqual(con.execute('SELECT COUNT(*) AS n FROM products').fetchone()['n'], before)
            self.assertEqual(product['stock'], 3)

    def test_foreign_branch_and_foreign_prices_rejected(self):
        with server.connect() as con:
            with self.assertRaises(ValueError):
                branches.save(con, 1, {**self.form, 'id': self.ident, 'revision': 1})
            with self.assertRaises(ValueError):
                branches.resolve(con, {**self.product, 'seller_id': 1}, self.ident)
            with self.assertRaises(ValueError):
                branches.save(con, 2, {**self.form, 'prices': {'99999': '1'}})

    def test_invalid_prices_and_locations(self):
        for amount in ('NaN', 'Infinity', '-1', '1.001', '1000001', True):
            with self.subTest(amount=amount), server.connect() as con, self.assertRaises(ValueError):
                branches.save(con, 2, {**self.form, 'prices': {'1': amount}})
        with server.connect() as con, self.assertRaises(ValueError):
            branches.save(con, 2, {**self.form, 'coordinates': {'lat': 50, 'lng': 100}})
        with server.connect() as con, self.assertRaises(ValueError):
            branches.save(con, 2, {**self.form, 'confirmed': False})

    def test_stale_edit_and_closed_branch(self):
        with server.connect() as con:
            branches.save(con, 2, {**self.form, 'id': self.ident, 'revision': 1, 'is_open': False})
            with self.assertRaises(ValueError):
                branches.resolve(con, self.product, self.ident)
            with self.assertRaises(ValueError):
                branches.save(con, 2, {**self.form, 'id': self.ident, 'revision': 1})
            offered = branches.offers(con, self.product)
            self.assertFalse(next(b for b in offered if b['id'] == self.ident)['is_open'])
            branches.save(con, 2, {**self.form, 'id': self.ident, 'revision': 2, 'active': False})
            self.assertFalse(any(b['id'] == self.ident for b in branches.offers(con, self.product)))

    def test_checkout_uses_branch_price_and_pickup(self):
        data = self.quote()
        self.assertEqual(self.client.quote.call_args.args[0]['pickup']['address'], self.form['address'])
        self.handler.current_user = lambda: self.buyer
        with patch.object(server, 'send_json') as send:
            self.handler.checkout(data)
        ident = send.call_args.args[2]['id']
        with server.connect() as con:
            order = dict(con.execute('SELECT * FROM orders WHERE id=?', (ident,)).fetchone())
            self.assertAlmostEqual(order['total'], 34.9)
            details = json.loads(order['delivery_data'])
            self.assertEqual(details['context']['branch']['id'], self.ident)
            self.assertEqual(details['pickup_contact']['phone'], self.form['phone'])
            # Stock is reserved against the shared product, including other branches.
            other = branches.save(con, 2, {**self.form, 'name': 'Other'})
            with self.assertRaisesRegex(ValueError, 'Only 4'):
                self.handler.validate_checkout_payload(con, {**self.data, 'branch_id': other, 'quantity': 5}, self.buyer)

    def test_quote_invalidated_by_branch_price_address_or_selection(self):
        data = self.quote()
        with server.connect() as con:
            other = branches.save(con, 2, {**self.form, 'name': 'Other'})
            with self.assertRaisesRegex(ValueError, 'details changed'):
                delivery.consume(con, self.buyer, {**self.product, 'price': 25.5}, 1, {**data, 'branch_id': other})
            branches.save(con, 2, {**self.form, 'id': self.ident, 'revision': 1, 'address': 'New branch address'})
            with self.assertRaisesRegex(ValueError, 'details changed'):
                delivery.consume(con, self.buyer, {**self.product, 'price': 25.5}, 1, data)
            branches.save(con, 2, {**self.form, 'id': self.ident, 'revision': 2, 'prices': {'1': '30'}})
            with self.assertRaisesRegex(ValueError, 'price changed'):
                self.handler.validate_checkout_payload(con, data, self.buyer)

    def test_self_pickup_keeps_branch_snapshot_and_no_driver(self):
        self.handler.current_user = lambda: self.buyer
        with patch.object(server, 'send_json') as send, patch.object(server, 'LalamoveClient') as client:
            self.handler.checkout({**self.data, 'logistics_method': 'Ambil Sendiri', 'payment_method': 'Cash Pickup'})
            client.assert_not_called()
        with server.connect() as con:
            order = con.execute('SELECT * FROM orders WHERE id=?', (send.call_args.args[2]['id'],)).fetchone()
            self.assertEqual(order['total'], 25.5)
            self.assertEqual(json.loads(order['delivery_data'])['provider'], 'pickup')

    def test_seller_auth_and_key_access(self):
        with patch.object(server, 'send_json') as send:
            self.handler.seller_branches()
            self.assertEqual(send.call_args.args[2]['branches'][0]['id'], self.ident)
            self.handler.maps_config()
        self.handler.current_user = lambda: self.buyer
        with self.assertRaises(PermissionError):
            self.handler.seller_branches(self.form)


if __name__ == '__main__':
    unittest.main()
