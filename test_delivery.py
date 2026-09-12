import copy
from datetime import datetime, timedelta, timezone
import json
import os
import tempfile
import unittest
from unittest.mock import Mock, patch

import delivery
import server


class DeliveryTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        setting = patch.multiple(server, DB_PATH=os.path.join(self.temp.name, 'test.db'), USE_POSTGRES=False)
        setting.start(); self.addCleanup(setting.stop)
        server.init_db()
        self.user = {'id': 1, 'name': 'Buyer', 'role': 'buyer', 'phone': '01123456789'}
        self.point = {'address': 'Test pickup', 'coordinates': {'lat': 3.15, 'lng': 101.71}, 'confirmed': True}
        with server.connect() as con:
            con.execute("UPDATE users SET status='active',seller_status='approved' WHERE id=2")
            con.execute('UPDATE products SET seller_id=2,stock=5,weight_kg=0.5 WHERE id=1')
            delivery.save_pickup(con, 2, self.point)
            self.product = dict(con.execute('SELECT * FROM products WHERE id=1').fetchone())
        self.data = {'product_id': 1, 'quantity': 1, 'fee_version': 1, 'logistics_method': 'Lalamove Segera',
                     'address': 'Test delivery', 'coordinates': {'lat': 3.14, 'lng': 101.69},
                     'location_confirmed': True, 'package_confirmed': True, 'city': 'MY KUL',
                     'service_type': 'MOTORCYCLE', 'buyer_phone': '01123456789', 'payment_method': 'Billplz'}
        self.client = Mock()
        self.client.cities.return_value = [{'locode': 'MY KUL', 'services': [{'key': 'MOTORCYCLE', 'load': {'value': '10', 'unit': 'kg'}}]}]
        self.client.quote.return_value = {'quotationId': '123', 'priceBreakdown': {'total': '9.0', 'currency': 'MYR'},
                                          'expiresAt': (datetime.now(timezone.utc)+timedelta(minutes=5)).isoformat()}
        self.handler = object.__new__(server.Handler)
        self.handler.current_user = lambda: self.user

    def quoted(self):
        with server.connect() as con:
            q = delivery.create_quote(con, self.user, self.product, 1, self.data, self.client)
        return {**self.data, 'quote_id': q['quote_id']}

    def test_price_is_server_owned_and_quote_single_use(self):
        data = {**self.quoted(), 'logistics_fee': -999}
        with server.connect() as con:
            fee, details = delivery.consume(con, self.user, self.product, 1, data)
        self.assertEqual(fee, 9.4)
        self.assertEqual(details['dispatch_status'], 'manual_booking_required')
        with server.connect() as con, self.assertRaises(ValueError):
            delivery.consume(con, self.user, self.product, 1, data)

    def test_expired_quote(self):
        data = self.quoted()
        with server.connect() as con:
            con.execute('UPDATE delivery_quotes SET expires_at=0')
        with server.connect() as con, self.assertRaises(ValueError):
            delivery.consume(con, self.user, self.product, 1, data)

    def test_quote_binding(self):
        original = self.quoted()
        for change in ({'address': 'Different address'}, {'coordinates': {'lat': 4, 'lng': 102}},
                       {'service_type': 'CAR'}, {'logistics_method': 'Lalamove Biasa'},
                       {'variant': 'other'}, {'city': 'MY JHB'}, {'schedule_at': 'tomorrow'}):
            with self.subTest(change=change), server.connect() as con, self.assertRaises(ValueError):
                delivery.consume(con, self.user, self.product, 1, {**original, **change})
        with server.connect() as con, self.assertRaises(ValueError):
            delivery.consume(con, {**self.user, 'id': 99}, self.product, 1, original)
        with server.connect() as con, self.assertRaises(ValueError):
            delivery.consume(con, self.user, self.product, 2, original)
        with server.connect() as con, self.assertRaises(ValueError):
            delivery.consume(con, self.user, {**self.product, 'price': 999}, 1, original)

    def test_changed_pickup_and_disabled_seller(self):
        data = self.quoted()
        with server.connect() as con:
            delivery.save_pickup(con, 2, {**self.point, 'address': 'New pickup'})
        with server.connect() as con, self.assertRaises(ValueError):
            delivery.consume(con, self.user, self.product, 1, data)
        with server.connect() as con:
            con.execute("UPDATE users SET status='suspended' WHERE id=2")
        with server.connect() as con, self.assertRaises(ValueError):
            delivery.create_quote(con, self.user, self.product, 1, self.data, self.client)

    def test_missing_pickup_and_confirmations(self):
        for changes in ({'location_confirmed': False}, {'package_confirmed': False}):
            with server.connect() as con, self.assertRaises(ValueError):
                delivery.create_quote(con, self.user, self.product, 1, {**self.data, **changes}, self.client)
        with server.connect() as con:
            con.execute('DELETE FROM delivery_pickups')
        with server.connect() as con, self.assertRaises(ValueError):
            delivery.create_quote(con, self.user, self.product, 1, self.data, self.client)

    def test_capacity_and_unknown_service(self):
        for product in ({**self.product, 'weight_kg': 20}, {**self.product, 'weight_kg': float('nan')}):
            with server.connect() as con, self.assertRaises(ValueError):
                delivery.create_quote(con, self.user, product, 1, self.data, self.client)
        with server.connect() as con, self.assertRaises(ValueError):
            delivery.create_quote(con, self.user, self.product, 1, {**self.data, 'service_type': 'JET'}, self.client)

    def test_pickup_is_free_and_cannot_self_mark_paid(self):
        with server.connect() as con:
            fee, details = delivery.consume(con, self.user, self.product, 5, {'logistics_method': 'Ambil Sendiri', 'logistics_fee': 99})
        self.assertEqual(fee, 0)
        self.assertIsNone(details)
        with patch.object(server, 'send_json') as send:
            self.handler.checkout({**self.data, 'logistics_method': 'Ambil Sendiri', 'payment_method': 'Cash Pickup', 'payment_status': 'paid'})
        self.assertEqual(send.call_args.args[2]['payment_status'], 'unpaid')
        with self.assertRaises(ValueError):
            self.handler.checkout(self.quoted())

    def test_cash_delivery_and_legacy_rates_rejected(self):
        with self.assertRaises(ValueError):
            self.handler.checkout({**self.data, 'payment_method': 'Cash Pickup'})
        for method in ('Barang Besar', 'Pooling', 'Seller Own Fleet', ''):
            with server.connect() as con, self.assertRaises(ValueError):
                delivery.consume(con, self.user, self.product, 1, {**self.data, 'logistics_method': method})

    def test_transaction_rollback_restores_quote(self):
        data = self.quoted()
        with self.assertRaises(RuntimeError):
            with server.connect() as con:
                delivery.consume(con, self.user, self.product, 1, data)
                raise RuntimeError('rolled back')
        with server.connect() as con:
            self.assertEqual(delivery.consume(con, self.user, self.product, 1, data)[0], 9.4)

    def test_both_gateway_paths_use_saved_fee_and_preserve_route(self):
        for method in ('create_billplz_payment', 'create_toyyibpay_payment'):
            data = {**self.quoted(), 'logistics_fee': 0}
            with patch.multiple(server, BILLPLZ_API_KEY='test', BILLPLZ_COLLECTION_ID='test', TOYYIBPAY_SECRET_KEY='test', TOYYIBPAY_CATEGORY_CODE='test'), \
                 patch.object(server, 'post_billplz', return_value={'id': 'test', 'url': 'https://example.test/pay'}), \
                 patch.object(server, 'post_toyyibpay', return_value=[{'BillCode':'test'}]), patch.object(server, 'send_json'):
                getattr(self.handler, method)(data)
            with server.connect() as con:
                order = con.execute('SELECT * FROM orders ORDER BY id DESC LIMIT 1').fetchone()
            self.assertEqual(order['logistics_fee'], 9.4)
            self.assertEqual(order['logistics_admin_fee'], 0.4)
            self.assertEqual(order['payment_status'], 'unpaid')
            self.assertEqual(order['tracking_no'], '')
            self.assertEqual(json.loads(order['delivery_data'])['context']['dropoff']['address'], 'Test delivery')

    def test_pickup_endpoint_role_and_owner(self):
        with self.assertRaises(PermissionError): self.handler.delivery_pickup(self.point)
        self.handler.current_user = lambda: {'id': 2, 'role': 'seller'}
        with patch.object(server, 'send_json') as send: self.handler.delivery_pickup(self.point)
        self.assertEqual(send.call_args.args[2]['pickup']['address'], self.point['address'])

    def test_whole_quantity(self):
        for qty in (1.5, True, 'nan', 'inf'):
            with server.connect() as con, self.assertRaises(ValueError):
                self.handler.validate_checkout_payload(con, {**self.data, 'quantity':qty}, self.user)

    def test_fee_is_per_order_not_quantity_and_cannot_be_overridden(self):
        data = {**self.data, 'quantity': 3, 'admin_fee': 999, 'logistics_admin_fee': -5}
        with server.connect() as con:
            q = delivery.create_quote(con, self.user, self.product, 3, data, self.client)
            fee, details = delivery.consume(con, self.user, self.product, 3, {**data, 'quote_id': q['quote_id']})
        self.assertEqual(q['courier_fee'], 9)
        self.assertEqual(q['admin_fee'], .4)
        self.assertEqual(q['fee'], 9.4)
        self.assertEqual(fee, 9.4)
        self.assertEqual(details['quotation']['priceBreakdown']['total'], '9.0')

    def test_existing_quotes_keep_original_price(self):
        data = self.quoted()
        with server.connect() as con:
            row = con.execute('SELECT quotation FROM delivery_quotes WHERE id=?', (data['quote_id'],)).fetchone()
            quote = json.loads(row['quotation'])
            quote.pop('_pasarmalam_charges')
            con.execute('UPDATE delivery_quotes SET quotation=? WHERE id=?', (json.dumps(quote),data['quote_id']))
        data.pop('fee_version')
        with server.connect() as con:
            fee, details = delivery.consume(con, self.user, self.product, 1, data)
        self.assertEqual(fee, 9)
        self.assertEqual(details['charges']['admin_fee'], 0)

    def test_old_checkout_must_refresh_before_new_fee_quote(self):
        data = dict(self.data)
        data.pop('fee_version')
        with server.connect() as con, self.assertRaisesRegex(ValueError, 'refresh'):
            delivery.create_quote(con, self.user, self.product, 1, data, self.client)

    def test_platform_delivery_money_is_not_paid_to_seller(self):
        data = self.quoted()
        with patch.multiple(server, BILLPLZ_API_KEY='test', BILLPLZ_COLLECTION_ID='test'), \
             patch.object(server, 'post_billplz', return_value={'id':'test','url':'https://example.test/pay'}), \
             patch.object(server, 'send_json') as send:
            self.handler.create_billplz_payment(data)
        order_id = send.call_args.args[2]['order_id']
        with server.connect() as con:
            con.execute("UPDATE orders SET payment_status='paid',order_status='completed',escrow_status='released' WHERE id=?", (order_id,))
            server.sync_wallet_settlements(con)
            row = con.execute("SELECT gross_amount FROM wallet WHERE order_id=? AND type='settlement'", (order_id,)).fetchone()
        self.assertAlmostEqual(row['gross_amount'], float(self.product['price']))


if __name__ == '__main__': unittest.main()
