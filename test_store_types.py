import unittest
from unittest.mock import patch
import seller_shops
import server
from test_bank_transfer import BankTransferTests


class StoreTypeTests(BankTransferTests):
    def test_new_seller_registration_persists_store_type(self):
        data=dict(role='seller',name='Factory Owner',email='factory-new@example.test',password='TestPassword123',
                  phone='01100000000',shop_name='Factory New',shop_category='Electronics',store_type='factory',
                  identity_type='Passport',identity_number='QA ONLY',bank_name='Test',bank_account_name='QA',bank_account_number='000',email_otp_token='test')
        with patch.object(server,'verify_email_otp_token',return_value=True):self.h.signup(data)
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT store_type FROM users WHERE email=?',(data['email'],)).fetchone()['store_type'],'factory')

    def test_buyer_onboarding_persists_store_type(self):
        self.h.seller_onboarding(dict(name='QA Buyer',phone='01100000000',address='QA Address',
            shop_name='Factory Onboarding',shop_category='Electronics',store_type='factory',identity_type='Passport',
            identity_number='QA ONLY',bank_name='Test',bank_account_name='QA',bank_account_number='000'))
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT store_type FROM users WHERE id=1').fetchone()['store_type'],'factory')
    def test_migration_preserves_existing_store_and_listings(self):
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT store_type FROM users WHERE id=2').fetchone()['store_type'], '')
            previous=dict(con.execute('SELECT * FROM products WHERE id=1').fetchone())
            server.migrate_users(con)
            self.assertEqual(dict(con.execute('SELECT * FROM products WHERE id=1').fetchone()),previous)

    def test_each_new_shop_has_its_own_type(self):
        with server.connect() as con:
            shop=seller_shops.create(con,2,{'shop_name':'Factory shop','shop_category':'Electronics','store_type':'factory'},server.SHOP_CATEGORIES)
            self.assertEqual(shop['store_type'],'factory')
        with server.connect() as con:
            shop=seller_shops.create(con,2,{'shop_name':'Wholesale shop','shop_category':'Electronics','store_type':'bulk'},server.SHOP_CATEGORIES)
            self.assertEqual(shop['store_type'],'bulk')
            self.assertEqual(con.execute('SELECT store_type FROM users WHERE id=2').fetchone()['store_type'],'')

    def test_invalid_store_type(self):
        for value in ('', 'factory-direct', None, 'admin'):
            with self.subTest(value=value),self.assertRaises(ValueError):seller_shops.store_type(value)

    def test_new_listing_inherits_factory_and_floor(self):
        self.user={'id':2,'role':'seller','shop_name':'Factory','name':'Factory'}
        with server.connect() as con:
            con.execute("UPDATE users SET store_type='factory',shop_category='Electronics' WHERE id=2")
        self.h.create_product({'name':'Cable','shop':'Factory','category':'Electronics','price':2,'stock':3000,
                              'condition':'New','price_mode':'Fixed','weight_kg':0.1,'selling_mode':'retail','minimum_order':1})
        ident=self.send.call_args.args[2]['id']
        with server.connect() as con:
            row=con.execute('SELECT selling_mode,minimum_order FROM products WHERE id=?',(ident,)).fetchone()
            self.assertEqual((row['selling_mode'],row['minimum_order']),('factory',500))
        with self.assertRaises(ValueError):
            self.h.create_product({'name':'Cable','shop':'Factory','category':'Electronics','price':2,'stock':3000,
                                   'condition':'New','price_mode':'Fixed','weight_kg':0.1,'minimum_order':500.5})

    def test_type_change_does_not_reclassify_existing_products(self):
        self.user={'id':2,'role':'seller','email':'seller@example.test'}
        with server.connect() as con:before=dict(con.execute('SELECT * FROM products WHERE id=1').fetchone())
        self.h.update_profile({'store_type':'factory'})
        with server.connect() as con:
            self.assertEqual(dict(con.execute('SELECT * FROM products WHERE id=1').fetchone()),before)
            self.assertEqual(con.execute('SELECT store_type FROM users WHERE id=2').fetchone()['store_type'],'factory')


def load_tests(loader,tests,pattern):
    return unittest.TestSuite(StoreTypeTests(name) for name in StoreTypeTests.__dict__ if name.startswith('test_'))
