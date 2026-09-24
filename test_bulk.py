import os
import tempfile
import unittest
from unittest.mock import patch
import server


class BulkTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        env = patch.multiple(server, DB_PATH=os.path.join(temp.name, 'bulk.sqlite'), USE_POSTGRES=False)
        env.start()
        self.addCleanup(env.stop)
        server.init_db()
        self.h = object.__new__(server.Handler)
        self.user = {'id': 2, 'role': 'seller', 'name': 'Test', 'shop_name': 'Test shop'}
        self.h.current_user = lambda: self.user
        reply = patch.object(server, 'send_json')
        self.reply = reply.start()
        self.addCleanup(reply.stop)
        with server.connect() as con:
            con.execute("UPDATE users SET shop_category='Electronics' WHERE id=2")
        self.payload = dict(name='Bulk cable', shop='Test', category='Electronics', price=3,
                            stock=100, weight_kg=.05, condition='New', price_mode='Fixed',
                            selling_mode='bulk', minimum_order=10)
        self.h.create_product(self.payload)
        self.product_id = self.reply.call_args.args[2]['id']

    def buyer(self):
        self.user = {'id': 1, 'role': 'buyer', 'address': 'Test address', 'phone': '01123456789'}

    def test_saved_and_partial_edit(self):
        self.h.product_by_id('PUT', f'/api/products/{self.product_id}', {'price': 4})
        with server.connect() as con:
            row = con.execute('SELECT * FROM products WHERE id=?', (self.product_id,)).fetchone()
            self.assertEqual((row['selling_mode'], row['minimum_order'], row['price']), ('bulk', 10, 4))

    def test_invalid_minimum(self):
        for minimum in (0, 1, -1, 2.5, True, None, 'x', float('inf')):
            with self.subTest(minimum=minimum), self.assertRaises(ValueError):
                self.h.create_product({**self.payload, 'minimum_order': minimum})
        with self.assertRaises(ValueError):
            self.h.create_product({**self.payload, 'selling_mode': 'unknown'})

    def test_retail_defaults_and_switch(self):
        self.h.product_by_id('PUT', f'/api/products/{self.product_id}', {'selling_mode': 'retail', 'minimum_order': 1})
        self.buyer()
        self.h.cart_route('POST', {'product_id': self.product_id, 'quantity': 1})

    def test_cart_minimum_and_update(self):
        self.buyer()
        for quantity in (1, 9, 9.9, True):
            with self.subTest(quantity=quantity), self.assertRaises(ValueError):
                self.h.cart_route('POST', {'product_id': self.product_id, 'quantity': quantity})
        self.h.cart_route('POST', {'product_id': self.product_id, 'quantity': 10})
        item = self.reply.call_args.args[2]['id']
        with self.assertRaises(ValueError):
            self.h.cart_route('PUT', {'id': item, 'product_id': self.product_id, 'quantity': 9})
        self.h.cart_route('POST', {'product_id': self.product_id, 'quantity': 1})
        self.assertEqual(self.reply.call_args.args[2]['quantity'], 11)

    def test_checkout_and_quote_validation(self):
        self.buyer()
        with server.connect() as con:
            for quantity in (1, 9):
                with self.assertRaisesRegex(ValueError, 'Minimum order'):
                    self.h.validate_checkout_payload(con, {'product_id': self.product_id, 'quantity': quantity}, self.user)
            result = self.h.validate_checkout_payload(con, {'product_id': self.product_id, 'quantity': 10, 'payment_method': 'Cash Pickup'}, self.user)
            self.assertEqual(result[1], 10)
            con.execute('UPDATE products SET minimum_order=20 WHERE id=?', (self.product_id,))
            with self.assertRaisesRegex(ValueError, 'Minimum order'):
                self.h.validate_checkout_payload(con, {'product_id': self.product_id, 'quantity': 10}, self.user)

    def test_cart_wrong_product_cannot_bypass(self):
        self.buyer()
        self.h.cart_route('POST', {'product_id': self.product_id, 'quantity': 10})
        item = self.reply.call_args.args[2]['id']
        with self.assertRaises(ValueError):
            self.h.cart_route('PUT', {'id': item, 'product_id': 1, 'quantity': 1})


if __name__ == '__main__':
    unittest.main()
