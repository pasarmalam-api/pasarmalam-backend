import unittest
from unittest.mock import patch

import server
import test_delivery


class ShopAvailabilityTest(unittest.TestCase):
    setUp = test_delivery.DeliveryTest.setUp
    quoted = test_delivery.DeliveryTest.quoted

    def seller(self):
        with server.connect() as con:
            con.execute("UPDATE products SET category='Street Food' WHERE id=1")
        self.handler.current_user = lambda: {'id': 2, 'role': 'seller'}

    def close(self):
        with server.connect() as con:
            con.execute('UPDATE users SET shop_open=0 WHERE id=2')

    def test_default_open_and_owner_only_update(self):
        self.seller()
        with patch.object(server, 'send_json') as send:
            self.handler.seller_availability()
            self.assertTrue(send.call_args.args[2]['is_open'])
            self.assertTrue(send.call_args.args[2]['eligible'])
            self.handler.seller_availability({'is_open': False, 'seller_id': 3})
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT shop_open FROM users WHERE id=2').fetchone()[0], 0)
            self.assertEqual(con.execute('SELECT shop_open FROM users WHERE id=3').fetchone()[0], 1)
        with patch.object(server, 'send_json') as send:
            self.handler.seller_availability()
            self.assertFalse(send.call_args.args[2]['is_open'])
            self.handler.seller_availability({'is_open': True})
            self.assertTrue(send.call_args.args[2]['is_open'])

    def test_buyer_anonymous_and_invalid_values_rejected(self):
        for user in (None, self.user, {'id': 3, 'role': 'admin'}):
            self.handler.current_user = lambda: user
            with self.assertRaises(PermissionError):
                self.handler.seller_availability({'is_open': False})
        self.seller()
        for value in ('false', 0, 1, None, [], {}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.handler.seller_availability({'is_open': value})

    def test_nonfood_hidden_but_closed_shop_can_reopen(self):
        self.seller()
        with server.connect() as con:
            con.execute("UPDATE products SET category='Phones' WHERE seller_id=2")
        with patch.object(server, 'send_json') as send:
            self.handler.seller_availability()
            self.assertFalse(send.call_args.args[2]['eligible'])
        with self.assertRaises(ValueError):
            self.handler.seller_availability({'is_open': False})
        self.close()
        with patch.object(server, 'send_json'):
            self.handler.seller_availability({'is_open': True})

    def test_closed_visible_in_catalogue_and_other_sellers_unchanged(self):
        self.close()
        with patch.object(server, 'send_json') as send:
            self.handler.get_products({})
        rows = send.call_args.args[2]['products']
        self.assertFalse(next(p for p in rows if p['id'] == 1)['shop_open'])
        self.assertTrue(all(p['shop_open'] for p in rows if p['seller_id'] != 2))

    def test_closed_blocks_cash_cart_quote_and_both_gateways(self):
        data = self.quoted()
        self.close()
        with patch.multiple(server, BILLPLZ_API_KEY='test', BILLPLZ_COLLECTION_ID='test',
                            TOYYIBPAY_SECRET_KEY='test', TOYYIBPAY_CATEGORY_CODE='test'):
            for method in ('create_billplz_payment', 'create_toyyibpay_payment', 'delivery_quotation'):
                with self.subTest(method=method), self.assertRaisesRegex(ValueError, 'Shop is closed'):
                    getattr(self.handler, method)(data)
        with self.assertRaisesRegex(ValueError, 'Shop is closed'):
            self.handler.checkout({**data, 'logistics_method': 'Ambil Sendiri', 'payment_method': 'Cash Pickup'})
        with self.assertRaisesRegex(ValueError, 'Shop is closed'):
            self.handler.cart_route('POST', {'product_id': 1, 'quantity': 1})
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT used FROM delivery_quotes WHERE id=?', (data['quote_id'],)).fetchone()[0], 0)

    def test_reopening_restores_checkout_and_preserves_existing_orders(self):
        with patch.object(server, 'send_json'):
            self.handler.checkout({**self.data, 'logistics_method': 'Ambil Sendiri', 'payment_method': 'Cash Pickup'})
        with server.connect() as con:
            before = [dict(r) for r in con.execute('SELECT * FROM orders')]
        self.seller()
        with patch.object(server, 'send_json'):
            self.handler.seller_availability({'is_open': False})
            self.handler.seller_availability({'is_open': True})
        with server.connect() as con:
            self.assertEqual(before, [dict(r) for r in con.execute('SELECT * FROM orders')])
            self.handler.validate_checkout_payload(con, self.data, self.user)


if __name__ == '__main__':
    unittest.main()
