import sqlite3
import unittest
from unittest.mock import patch
import server


class AdminActionsTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.db.executescript("""
            CREATE TABLE users (id INTEGER PRIMARY KEY, role TEXT, status TEXT, seller_status TEXT, name TEXT, email TEXT);
            INSERT INTO users VALUES (2, 'seller', 'active', 'pending', 'Test Seller', 'seller@example.test'), (3, 'buyer', 'active', 'not_applicable', 'Buyer', 'buyer@example.test');
            CREATE TABLE notifications (id INTEGER PRIMARY KEY, role TEXT, user_id INTEGER, read_at INTEGER, title TEXT, body TEXT, type TEXT, target_url TEXT, created_at INTEGER);
            INSERT INTO notifications (id, role, user_id, read_at) VALUES (10, 'admin', 0, 0), (11, 'admin', 0, 0);
            CREATE TABLE audit_logs (id INTEGER PRIMARY KEY, actor_id INTEGER, action TEXT, target_type TEXT, target_id INTEGER, note TEXT, created_at INTEGER);
        """)
        server.migrate_seller_email_queue(self.db)
        self.handler = object.__new__(server.Handler)
        self.handler.current_user = lambda: {'id': 1, 'role': 'admin'}
        self.handler.audit = lambda *args: None
        self.connection = patch.object(server, 'connect', return_value=self.db)
        self.response = patch.object(server, 'send_json')
        self.connection.start()
        self.response.start()
        self.addCleanup(self.connection.stop)
        self.addCleanup(self.response.stop)
        self.addCleanup(self.db.close)

    def test_approve_persists_and_can_repeat(self):
        for _ in range(2):
            self.handler.admin_update_user_status({'user_id': 2, 'status': 'active', 'seller_status': 'approved'})
        self.assertEqual(self.db.execute('SELECT seller_status FROM users WHERE id=2').fetchone()[0], 'approved')
        self.assertEqual(self.db.execute('SELECT count(*) FROM seller_email_queue').fetchone()[0], 1)

    def test_reject_requires_reason_and_emails_seller(self):
        with self.assertRaisesRegex(ValueError, 'reason'):
            self.handler.admin_update_user_status({'user_id': 2, 'status': 'suspended', 'seller_status': 'rejected'})
        self.handler.admin_update_user_status({'user_id': 2, 'status': 'suspended', 'seller_status': 'rejected', 'reason': '<Missing document>'})
        message = self.db.execute('SELECT recipient, html FROM seller_email_queue').fetchone()
        self.assertEqual(message['recipient'], 'seller@example.test')
        self.assertIn('&lt;Missing document&gt;', message['html'])

    def test_approval_clears_only_matching_application_notification(self):
        self.db.execute("UPDATE notifications SET title='New seller application #2', target_url='sellers.html' WHERE id=10")
        self.handler.admin_update_user_status({'user_id': 2, 'status': 'active', 'seller_status': 'approved'})
        self.assertGreater(self.db.execute('SELECT read_at FROM notifications WHERE id=10').fetchone()[0], 0)
        self.assertEqual(self.db.execute('SELECT read_at FROM notifications WHERE id=11').fetchone()[0], 0)

    def test_email_queue_failure_rolls_back_decision(self):
        self.db.commit()
        self.db.execute('DROP TABLE seller_email_queue')
        with self.assertRaises(sqlite3.OperationalError):
            self.handler.admin_update_user_status({'user_id': 2, 'status': 'active', 'seller_status': 'approved'})
        self.assertEqual(self.db.execute('SELECT seller_status FROM users WHERE id=2').fetchone()[0], 'pending')

    def test_missing_account_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Account not found'):
            self.handler.admin_update_user_status({'user_id': 99})

    def test_buyer_cannot_be_approved_as_seller(self):
        with self.assertRaisesRegex(ValueError, 'Only seller'):
            self.handler.admin_update_user_status({'user_id': 3, 'seller_status': 'approved'})

    def test_invalid_status_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Invalid'):
            self.handler.admin_update_user_status({'user_id': 2, 'status': 'invalid'})

    def test_non_admin_cannot_approve(self):
        self.handler.current_user = lambda: {'id': 3, 'role': 'buyer'}
        with self.assertRaises(PermissionError):
            self.handler.admin_update_user_status({'user_id': 2})

    def test_read_one_then_read_all(self):
        self.handler.mark_notifications_read({'notification_id': 10})
        self.assertEqual(self.db.execute('SELECT count(*) FROM notifications WHERE read_at=0').fetchone()[0], 1)
        self.handler.mark_notifications_read({})
        self.assertEqual(self.db.execute('SELECT count(*) FROM notifications WHERE read_at=0').fetchone()[0], 0)

    def prepare_deletion(self):
        for table, column in (("products", "seller_id"), ("orders", "buyer_id"), ("returns", "buyer_id"), ("wallet", "seller_id"), ("campaigns", "seller_id"), ("reviews", "seller_id"), ("cart_items", "buyer_id"), ("wishlist", "buyer_id"), ("support_tickets", "user_id")):
            self.db.execute(f"CREATE TABLE {table} (id INTEGER PRIMARY KEY, {column} INTEGER)")
        self.db.execute("CREATE TABLE email_otps (id INTEGER PRIMARY KEY, email TEXT)")
        self.db.commit()

    def test_delete_account_and_only_its_data(self):
        self.prepare_deletion()
        self.db.execute('INSERT INTO cart_items VALUES (1,3),(2,2)')
        self.handler.admin_delete_user({'user_id': 3, 'confirm_email': 'buyer@example.test'})
        self.assertIsNone(self.db.execute('SELECT id FROM users WHERE id=3').fetchone())
        self.assertIsNotNone(self.db.execute('SELECT id FROM users WHERE id=2').fetchone())
        self.assertEqual(self.db.execute('SELECT buyer_id FROM cart_items').fetchone()[0], 2)
        self.assertEqual(self.db.execute("SELECT count(*) FROM audit_logs WHERE action='user_deleted'").fetchone()[0], 1)

    def test_delete_blocks_transaction_history(self):
        self.prepare_deletion()
        self.db.execute('INSERT INTO orders VALUES (1,3)')
        self.db.commit()
        with self.assertRaisesRegex(ValueError, 'linked'):
            self.handler.admin_delete_user({'user_id': 3, 'confirm_email': 'buyer@example.test'})
        self.assertIsNotNone(self.db.execute('SELECT id FROM users WHERE id=3').fetchone())

    def test_delete_requires_confirmation(self):
        with self.assertRaisesRegex(ValueError, 'email'):
            self.handler.admin_delete_user({'user_id': 3, 'confirm_email': 'wrong'})

    def test_delete_protects_admin(self):
        self.db.execute("UPDATE users SET role='admin' WHERE id=3")
        with self.assertRaisesRegex(ValueError, 'Administrator'):
            self.handler.admin_delete_user({'user_id': 3, 'confirm_email': 'buyer@example.test'})

    def test_delete_requires_admin(self):
        self.handler.current_user = lambda: {'id': 3, 'role': 'buyer'}
        with self.assertRaises(PermissionError):
            self.handler.admin_delete_user({'user_id': 2})


if __name__ == '__main__':
    unittest.main()
