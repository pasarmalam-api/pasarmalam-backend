import unittest
from unittest.mock import patch

import server
from test_bank_transfer import BankTransferTests


class FactoryTests(BankTransferTests):
    # Reuse setup helpers without inheriting the bulk-specific assertions.
    def setUp(self):
        super().setUp()
        with server.connect() as con:
            con.execute("UPDATE products SET selling_mode='factory',minimum_order=500,stock=5000 WHERE id=1")
        self.data['quantity'] = 500

    def test_factory_listing_minimum_and_higher_moq(self):
        for minimum in (10, 300, 499, 500.5, True):
            with self.subTest(minimum=minimum), self.assertRaises(ValueError):
                self.h.validate_product({'selling_mode': 'factory', 'minimum_order': minimum})
        for minimum in (500, 1000):
            self.h.validate_product({'selling_mode': 'factory', 'minimum_order': minimum})
        with server.connect() as con:
            con.execute('UPDATE products SET minimum_order=1000 WHERE id=1')
            with self.assertRaisesRegex(ValueError, '1000 units'):
                self.h.validate_checkout_payload(con, self.data, self.user)

    def test_factory_cart_and_checkout_floor(self):
        with self.assertRaisesRegex(ValueError, '500 units'):
            self.h.cart_route('POST', {'product_id': 1, 'quantity': 499})
        self.h.cart_route('POST', {'product_id': 1, 'quantity': 500})
        item = self.send.call_args.args[2]['id']
        with self.assertRaisesRegex(ValueError, '500 units'):
            self.h.cart_route('PUT', {'id': item, 'product_id': 1, 'quantity': 499})
        with server.connect() as con:
            con.execute('UPDATE products SET minimum_order=1 WHERE id=1')
            with self.assertRaisesRegex(ValueError, '500 units'):
                self.h.validate_checkout_payload(con, {**self.data, 'quantity': 499}, self.user)
            server.migrate_products(con)
            self.assertEqual(con.execute('SELECT minimum_order FROM products WHERE id=1').fetchone()['minimum_order'], 500)

    def test_factory_transfer_and_immutable_commission(self):
        order_id = self.create()
        row = self.row(order_id)
        self.assertEqual((row['order_type'], row['agreed_commission_rate']), ('factory', 3))
        self.assertTrue(row['payment_reference'].startswith('PM-FACTORY-'))
        self.assertEqual((row['payment_status'], row['order_status']), ('unpaid', 'pending_payment'))
        with server.connect() as con:
            con.execute("UPDATE products SET selling_mode='retail',minimum_order=1 WHERE id=1")
            con.execute("UPDATE users SET business_verification_status='verified' WHERE id=2")
            con.execute("UPDATE orders SET payment_status='paid',order_status='completed',escrow_status='holding' WHERE id=?", (order_id,))
            server.sync_wallet_settlements(con)
            server.sync_wallet_settlements(con)
            rows = con.execute("SELECT * FROM wallet WHERE order_id=? AND type='settlement'", (order_id,)).fetchall()
            self.assertEqual(len(rows), 1)
            self.assertEqual((rows[0]['commission_rate'], rows[0]['commission_amount'], rows[0]['seller_earning']), (3, 75, 2425))

    def test_factory_cannot_use_cash_or_gateway(self):
        for method in ('Cash Pickup', 'Pay on Arrival'):
            with self.subTest(method=method), self.assertRaises(ValueError):
                self.h.checkout({**self.data, 'payment_method': method})
        with patch.multiple(server, BILLPLZ_API_KEY='test', BILLPLZ_COLLECTION_ID='test'), patch.object(server, 'post_billplz') as gateway:
            for method in ('Billplz', 'Bank Transfer', 'quotation'):
                with self.subTest(method=method), self.assertRaisesRegex(ValueError, 'Factory Direct'):
                    self.h.create_billplz_payment({**self.data, 'payment_method': method})
            gateway.assert_not_called()

    def test_factory_listing_create_and_partial_edit(self):
        self.user = {'id': 2, 'role': 'seller', 'name': 'Factory', 'shop_name': 'Factory'}
        with server.connect() as con:
            con.execute("UPDATE users SET shop_category='Electronics' WHERE id=2")
        self.h.create_product({'name': 'Factory cable', 'shop': 'Factory', 'category': 'Electronics', 'price': 5,
                              'weight_kg': 0.05, 'condition': 'New', 'price_mode': 'Fixed',
                              'stock': 3000, 'selling_mode': 'factory', 'minimum_order': 1000})
        product_id = self.send.call_args.args[2]['id']
        self.h.product_by_id('PUT', f'/api/products/{product_id}', {'price': 6})
        with server.connect() as con:
            product = con.execute('SELECT * FROM products WHERE id=?', (product_id,)).fetchone()
            self.assertEqual((product['selling_mode'], product['minimum_order'], product['price']), ('factory', 1000, 6))

    def test_existing_bulk_rate_not_changed_by_factory_conversion(self):
        with server.connect() as con:
            con.execute("UPDATE products SET selling_mode='bulk',minimum_order=10 WHERE id=1")
        self.data['quantity'] = 10
        order_id = self.create()
        with server.connect() as con:
            con.execute("UPDATE products SET selling_mode='factory',minimum_order=500 WHERE id=1")
            con.execute("UPDATE orders SET payment_status='paid',order_status='completed',escrow_status='holding' WHERE id=?", (order_id,))
            server.sync_wallet_settlements(con)
            rate = con.execute("SELECT commission_rate FROM wallet WHERE order_id=? AND type='settlement'", (order_id,)).fetchone()['commission_rate']
            self.assertEqual(rate, 5)


# Only run FactoryTests' own cases; bulk coverage runs in test_bank_transfer.
def load_tests(loader, tests, pattern):
    return unittest.TestSuite(FactoryTests(name) for name in FactoryTests.__dict__ if name.startswith('test_'))
