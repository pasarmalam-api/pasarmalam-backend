import os
import tempfile
import unittest
from unittest.mock import patch

import server


class BankTransferTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        env = patch.multiple(server, DB_PATH=os.path.join(temp.name, 'bank.sqlite'), USE_POSTGRES=False)
        env.start()
        self.addCleanup(env.stop)
        server.init_db()
        self.user = {'id': 1, 'name': 'Buyer', 'role': 'buyer', 'phone': '01123456789', 'address': 'Pickup'}
        self.h = object.__new__(server.Handler)
        self.h.current_user = lambda: self.user
        self.send = patch.object(server, 'send_json').start()
        self.addCleanup(patch.stopall)
        with server.connect() as con:
            con.execute("UPDATE users SET status='active',seller_status='approved' WHERE id=2")
            con.execute("UPDATE products SET selling_mode='bulk',minimum_order=10,stock=30,seller_id=2,price=5 WHERE id=1")
        self.data = {'product_id': 1, 'quantity': 10, 'address': 'Pickup', 'buyer_phone': '01123456789',
                     'payment_method': 'Bank Transfer', 'logistics_method': 'Ambil Sendiri',
                     'payment_status': 'paid', 'payment_reference': 'forged', 'payment_proof_url': 'forged'}

    def create(self):
        self.h.checkout(self.data)
        return self.send.call_args.args[2]['id']

    def row(self, order_id):
        with server.connect() as con:
            return dict(con.execute('SELECT * FROM orders WHERE id=?', (order_id,)).fetchone())

    def admin(self):
        self.user = {'id': 3, 'role': 'admin', 'name': 'Admin'}

    def test_create_is_unpaid_with_server_reference_and_no_dispatch(self):
        order_id = self.create()
        row = self.row(order_id)
        self.assertEqual((row['total'], row['payment_status'], row['order_status'], row['escrow_status']), (50, 'unpaid', 'pending_payment', 'pending'))
        self.assertTrue(row['payment_reference'].startswith(f'PM-BULK-{order_id}-'))
        self.assertEqual((row['tracking_no'], row['awb_label'], row['payment_proof_url'], row['payment_url']), ('', '', '', ''))

    def test_retail_and_minimum_cannot_bypass(self):
        self.data['quantity'] = 1
        with self.assertRaises(ValueError):
            self.create()
        with server.connect() as con:
            con.execute("UPDATE products SET selling_mode='retail',minimum_order=1 WHERE id=1")
        with self.assertRaisesRegex(ValueError, 'bulk listings'):
            self.create()

    def test_stock_reserved_until_cancelled(self):
        ids = [self.create() for _ in range(3)]
        with self.assertRaisesRegex(ValueError, 'available'):
            self.create()
        self.admin()
        self.h.admin_cancel_pending_payment({'order_id': ids[0]})
        self.user = {'id': 1, 'name': 'Buyer', 'role': 'buyer', 'phone': '01123456789'}
        self.create()

    def test_notify_never_confirms_payment_and_enforces_owner(self):
        order_id = self.create()
        self.h.bank_transfer_notify({'order_id': order_id, 'sender_reference': 'BANK-123'})
        row = self.row(order_id)
        self.assertEqual((row['payment_status'], row['order_status'], row['escrow_status']), ('pending_review', 'pending_payment', 'pending'))
        self.h.bank_transfer_details({'order_id': [str(order_id)]})
        self.assertEqual(self.send.call_args.args[2]['bank']['name'], 'Public Bank Berhad')
        self.user = {**self.user, 'id': 999}
        with self.assertRaises(PermissionError):
            self.h.bank_transfer_details({'order_id': [str(order_id)]})
        with self.assertRaises(PermissionError):
            self.h.bank_transfer_notify({'order_id': order_id, 'sender_reference': 'BANK-123'})

    def test_only_explicit_admin_confirmation_releases_order_once(self):
        order_id = self.create()
        with self.assertRaises(PermissionError):
            self.h.admin_update_payment_status({'order_id': order_id, 'payment_status': 'paid'})
        self.admin()
        with self.assertRaisesRegex(ValueError, 'Confirm the deposit'):
            self.h.admin_update_payment_status({'order_id': order_id, 'payment_status': 'paid'})
        data = {'order_id': order_id, 'payment_status': 'paid', 'bank_confirmed': True, 'settlement_reference': 'BANK-123'}
        self.h.admin_update_payment_status(data)
        self.assertEqual((self.row(order_id)['payment_status'], self.row(order_id)['order_status']), ('paid', 'placed'))
        with self.assertRaises(ValueError):
            self.h.admin_update_payment_status(data)
        with self.assertRaises(ValueError):
            self.h.admin_update_payment_status({'order_id': order_id, 'payment_status': 'rejected'})
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT stock FROM products WHERE id=1').fetchone()['stock'], 20)

    def test_cancelled_order_cannot_be_reopened(self):
        order_id = self.create()
        self.admin()
        self.h.admin_cancel_pending_payment({'order_id': order_id})
        with self.assertRaises(ValueError):
            self.h.admin_update_payment_status({'order_id': order_id, 'payment_status': 'paid', 'bank_confirmed': True, 'settlement_reference': 'LATE'})


if __name__ == '__main__':
    unittest.main()
