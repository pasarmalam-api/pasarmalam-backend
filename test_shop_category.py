import unittest
import sqlite3
from unittest.mock import patch
import server
import test_seller_registration


class ShopCategoryTest(unittest.TestCase):
    setUp = test_seller_registration.SellerRegistrationTest.setUp

    def test_groceries_registration_and_shop_change(self):
        self.handler.signup({**self.data, 'shop_category': 'Groceries'})
        with server.connect() as con:
            row = con.execute('SELECT shop_category FROM users WHERE email=?', (self.data['email'],)).fetchone()
            self.assertEqual(row['shop_category'], 'Groceries')
        self.seller()
        self.change('Groceries')
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT shop_category FROM users WHERE id=2').fetchone()[0], 'Groceries')
            self.assertTrue(all(r['category'] == 'Groceries' for r in con.execute('SELECT category FROM products WHERE seller_id=2')))

    def seller(self, seller_id=2):
        self.handler.current_user = lambda: {'id': seller_id, 'role': 'seller', 'name': 'Category seller', 'shop_name': 'Category shop'}

    def change(self, category, previous=''):
        self.handler.seller_category({'shop_category': category,
                                      'previous_category': previous, 'move_products': True})

    def test_registration_requires_valid_category(self):
        self.seller()
        with patch.object(server, 'send_json') as reply:
            self.handler.seller_profile()
            profile = reply.call_args.args[2]['user']
            self.assertEqual(profile['id'], 2)
            self.assertNotIn('password', profile)
        self.handler.current_user = lambda: {'id': 1, 'role': 'buyer'}
        with self.assertRaises(PermissionError):
            self.handler.seller_profile()

    def test_signup_requires_valid_category(self):
        for category in ('', 'Anything', None, ['Food']):
            with self.subTest(category=category), self.assertRaises(ValueError):
                self.handler.signup({**self.data, 'shop_category': category})
        self.handler.signup(self.data)
        with server.connect() as con:
            row = con.execute('SELECT shop_category FROM users WHERE email=?', (self.data['email'],)).fetchone()
            self.assertEqual(row['shop_category'], 'Street Food')

    def test_category_moves_only_owned_products_and_preserves_details(self):
        self.seller()
        with server.connect() as con:
            before = [dict(r) for r in con.execute('SELECT * FROM products')]
        self.change('Food')
        with server.connect() as con:
            after = [dict(r) for r in con.execute('SELECT * FROM products')]
        for old, new in zip(before, after):
            self.assertEqual(new.pop('category'), 'Food' if old['seller_id'] == 2 else old['category'])
            old.pop('category')
            self.assertEqual(old, new)
        self.change('Chargers', 'Food')
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT shop_category FROM users WHERE id=2').fetchone()[0], 'Chargers')

    def test_confirmation_stale_state_and_role_protection(self):
        self.seller()
        with self.assertRaises(ValueError):
            self.handler.seller_category({'shop_category': 'Food', 'previous_category': ''})
        self.change('Food')
        with self.assertRaises(ValueError):
            self.change('Phones')
        with self.assertRaises(ValueError):
            self.change('Fake', 'Food')
        self.handler.current_user = lambda: {'id': 1, 'role': 'buyer'}
        with self.assertRaises(PermissionError):
            self.change('Phones', 'Food')
        self.handler.current_user = lambda: None
        with self.assertRaises(PermissionError):
            self.handler.seller_category()

    def test_listing_cannot_override_category(self):
        self.seller()
        payload = dict(name='Test', shop='Test', category='Food', price=10,
                       stock=2, condition='New', price_mode='Fixed')
        with self.assertRaises(ValueError):
            self.handler.create_product(payload)
        self.change('Food')
        with self.assertRaises(ValueError):
            self.handler.create_product({**payload, 'category':'Phones'})
        with patch.object(server, 'send_json') as reply:
            self.handler.create_product(payload)
            product_id = reply.call_args.args[2]['id']
        with self.assertRaises(ValueError):
            self.handler.product_by_id('PUT', '/api/products/' + str(product_id), {'category': 'Phones'})
        self.handler.product_by_id('PUT', '/api/products/' + str(product_id), {'category':'Food', 'images':[]})
        self.change('Phones', 'Food')
        with self.assertRaises(ValueError):
            self.handler.product_by_id('PUT', '/api/products/' + str(product_id), {'category':'Food'})

    def test_profile_cannot_change_category(self):
        self.seller()
        self.change('Food')
        self.handler.update_profile({'shop_category':'Phones', 'shop_name':'Updated'})
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT shop_category FROM users WHERE id=2').fetchone()[0], 'Food')
            self.assertTrue(all(r[0] == 'Updated' for r in con.execute('SELECT shop FROM products WHERE seller_id=2')))
        with patch.object(server, 'send_json') as reply:
            self.handler.seller_profile()
            self.assertEqual(reply.call_args.args[2]['user']['shop_name'], 'Updated')

    def test_failed_bulk_move_rolls_back_shop_category(self):
        self.seller()
        with server.connect() as con:
            con.execute("CREATE TRIGGER fail_category BEFORE UPDATE OF category ON products BEGIN SELECT RAISE(ABORT, 'simulated failure'); END")
        with self.assertRaises(sqlite3.IntegrityError):
            self.change('Food')
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT shop_category FROM users WHERE id=2').fetchone()[0], '')

    def test_food_shop_can_open_close_before_listing(self):
        self.seller()
        with server.connect() as con:
            con.execute('DELETE FROM products WHERE seller_id=2')
        self.change('Street Food')
        with patch.object(server, 'send_json') as reply:
            self.handler.seller_availability()
            self.assertTrue(reply.call_args.args[2]['eligible'])


if __name__ == '__main__':
    unittest.main()
