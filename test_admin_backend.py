import sqlite3
import unittest
from unittest.mock import patch
import server


class AdminActionsTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.db.executescript("""
            CREATE TABLE users (id INTEGER PRIMARY KEY, role TEXT, status TEXT, seller_status TEXT);
            INSERT INTO users VALUES (2, 'seller', 'active', 'pending'), (3, 'buyer', 'active', 'not_applicable');
            CREATE TABLE notifications (id INTEGER PRIMARY KEY, role TEXT, user_id INTEGER, read_at INTEGER);
            INSERT INTO notifications VALUES (10, 'admin', 0, 0), (11, 'admin', 0, 0);
        """)
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


if __name__ == '__main__':
    unittest.main()
