import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

import server
import seller_shops


class SellerShopsTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        env = patch.multiple(server, DB_PATH=os.path.join(temp.name, 'test.sqlite'), USE_POSTGRES=False)
        env.start()
        self.addCleanup(env.stop)
        server.init_db()
        with server.connect() as con:
            self.owner = dict(con.execute('SELECT * FROM users WHERE id=2').fetchone())
        self.h = object.__new__(server.Handler)
        self.h.headers = {'Authorization': 'Bearer ' + server.make_token(self.owner)}
        reply = patch.object(server, 'send_json')
        self.reply = reply.start()
        self.addCleanup(reply.stop)

    def create(self, name='Second Shop'):
        with server.connect() as con:
            return seller_shops.create(con, 2, {'shop_name': name, 'shop_category': 'Food'}, server.SHOP_CATEGORIES)

    def switch(self, shop):
        self.h.switch_shop({'shop_id': shop['id']})
        result = self.reply.call_args.args[2]
        self.h.headers['Authorization'] = 'Bearer ' + result['token']
        return result

    def test_first_shop_counts_and_limit(self):
        for index in range(4):
            self.create('Shop ' + str(index))
        with self.assertRaises(ValueError):
            self.create('Sixth shop')
        with server.connect() as con:
            self.assertEqual(len(seller_shops.listing(con, 2)), 5)

    def test_unread_counts_are_scoped_to_owned_shops(self):
        shop = self.create()
        with server.connect() as con:
            con.execute('DELETE FROM notifications')
            for role, ident in [('seller', 2), ('seller', shop['id']),
                                ('seller', shop['id']), ('seller', 0),
                                ('buyer', shop['id']), ('seller', 99999)]:
                server.create_notification(con, role, ident, 'Test', 'Test')
            rows = {row['id']: row for row in seller_shops.listing(con, 2)}
            self.assertEqual(set(rows), {2, shop['id']})
            self.assertEqual(rows[2]['unread_notifications'], 2)
            self.assertEqual(rows[shop['id']]['unread_notifications'], 3)
            con.execute('UPDATE notifications SET read_at=1 WHERE user_id=?', (shop['id'],))
            rows = {row['id']: row for row in seller_shops.listing(con, 2)}
            self.assertEqual(rows[shop['id']]['unread_notifications'], 1)
            self.assertEqual(rows[2]['unread_notifications'], 2)

    def test_validation_and_ownership(self):
        shop = self.create()
        with self.assertRaises(ValueError):
            self.create('second shop')
        with server.connect() as con:
            with self.assertRaises(PermissionError):
                seller_shops.select(con, 1, shop['id'])
        with self.assertRaises(PermissionError):
            self.h.switch_shop({'shop_id': 1})
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT password FROM users WHERE id=?', (shop['id'],)).fetchone()[0], '')

    def test_token_and_buyer_round_trip(self):
        shop = self.create()
        result = self.switch(shop)
        self.assertEqual(result['user']['email'], self.owner['email'])
        user = self.h.current_user()
        self.assertEqual(user['id'], shop['id'])
        self.assertEqual(user['account_id'], 2)
        self.h.switch_role({'role': 'buyer'})
        result = self.reply.call_args.args[2]
        self.assertEqual(result['user']['id'], 2)
        self.assertEqual(result['user']['role'], 'buyer')

    def test_owner_password_revokes_child_token(self):
        self.switch(self.create())
        with server.connect() as con:
            con.execute('UPDATE users SET password=? WHERE id=2', (server.hash_password('NewPassword123!'),))
        self.assertIsNone(self.h.current_user())

    def test_products_stock_and_orders_are_separate(self):
        shop = self.create()
        self.switch(shop)
        self.h.get_products({})
        self.assertEqual(self.reply.call_args.args[2]['products'], [])
        self.h.create_product({'name': 'Shop food', 'shop': 'ignored', 'category': 'Food', 'price': 10,
                               'stock': 7, 'condition': 'New', 'price_mode': 'Fixed',
                               'weight_kg': 0.5, 'seller_id': 2})
        product_id = self.reply.call_args.args[2]['id']
        with server.connect() as con:
            product = con.execute('SELECT seller_id,stock FROM products WHERE id=?', (product_id,)).fetchone()
            self.assertEqual(tuple(product), (shop['id'], 7))
            con.execute("INSERT INTO orders(buyer_id,buyer_name,product_id,total,logistics_method,logistics_fee,payment_status,created_at) VALUES(1,'Buyer',?,10,'Pickup',0,'paid',1)", (product_id,))
        self.h.get_orders()
        self.assertEqual(len(self.reply.call_args.args[2]['orders']), 1)
        self.switch(self.owner)
        self.h.get_orders()
        self.assertFalse(any(order['product_id'] == product_id for order in self.reply.call_args.args[2]['orders']))
        with self.assertRaises(PermissionError):
            self.h.product_by_id('PUT', '/api/products/' + str(product_id), {'stock': 99})

    def test_profile_update_retains_owner_identity(self):
        shop = self.create()
        self.switch(shop)
        self.h.update_profile({'shop_name': 'Renamed Shop'})
        result = self.reply.call_args.args[2]
        self.assertEqual(result['user']['email'], self.owner['email'])
        self.h.headers['Authorization'] = 'Bearer ' + result['token']
        self.assertEqual(self.h.current_user()['id'], shop['id'])
        self.assertEqual(self.h.current_user()['account_id'], 2)

    def test_owner_suspension_revokes_child_token(self):
        self.switch(self.create())
        with server.connect() as con:
            con.execute("UPDATE users SET status='suspended' WHERE id=2")
        self.assertIsNone(self.h.current_user())

    def test_concurrent_creation_keeps_limit(self):
        def attempt(index):
            try:
                self.create('Concurrent ' + str(index))
                return True
            except ValueError:
                return False
        with ThreadPoolExecutor(max_workers=6) as pool:
            self.assertEqual(sum(pool.map(attempt, range(8))), 4)
        with server.connect() as con:
            self.assertEqual(len(seller_shops.listing(con, 2)), 5)


if __name__ == '__main__':
    unittest.main()
