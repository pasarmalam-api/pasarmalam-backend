import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import server


class SellerRegistrationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        for name, value in (("DB_PATH", str(Path(self.temp.name) / "test.db")), ("USE_POSTGRES", False), ("RESEND_API_KEY", "test-only")):
            mock = patch.object(server, name, value)
            mock.start()
            self.addCleanup(mock.stop)
        server.init_db()
        self.handler = object.__new__(server.Handler)
        self.data = dict(role="seller", name="<Test Seller>", email="seller@example.test",
                         password="test-password", phone="+60000000000", shop_name="Test & Shop",
                         identity_type="Passport", identity_number="private-id",
                         bank_name="Test Bank", bank_account_name="Test Seller",
                         bank_account_number="private-bank", email_otp_token="test")
        self.otp = patch.object(server, "verify_email_otp_token", return_value=True)
        self.reply = patch.object(server, "send_json")
        self.otp.start()
        self.reply.start()
        self.addCleanup(self.otp.stop)
        self.addCleanup(self.reply.stop)

    def rows(self):
        with server.connect() as con:
            return [dict(row) for row in con.execute("SELECT * FROM seller_email_queue ORDER BY id")]

    def test_signup_pending_and_two_emails_queued(self):
        self.handler.signup(self.data)
        with server.connect() as con:
            self.assertEqual(con.execute("SELECT seller_status FROM users WHERE email=?", (self.data["email"],)).fetchone()[0], "pending")
        rows = self.rows()
        self.assertEqual([r["recipient"] for r in rows], ["seller@example.test", "pasahmallam@gmail.com"])
        self.assertIn("&lt;Test Seller&gt;", rows[0]["html"])
        for row in rows:
            self.assertNotIn("private-bank", row["html"])
            self.assertNotIn("private-id", row["html"])
            self.assertNotIn("test-password", row["html"])

    def test_delivery_success_is_not_repeated(self):
        self.handler.signup(self.data)
        with patch.object(server, "send_email") as send:
            server.deliver_seller_emails()
            server.deliver_seller_emails()
        self.assertEqual(send.call_count, 2)
        self.assertTrue(all(row["sent_at"] for row in self.rows()))
        self.assertIn("idempotency_key", send.call_args.kwargs)

    def test_failure_retries_only_failed_message(self):
        self.handler.signup(self.data)
        with patch.object(server, "send_email", side_effect=[RuntimeError("offline"), {}]):
            server.deliver_seller_emails()
        rows = self.rows()
        self.assertEqual(rows[0]["sent_at"], 0)
        self.assertGreater(rows[0]["next_attempt_at"], server.now())
        self.assertGreater(rows[1]["sent_at"], 0)
        with server.connect() as con:
            con.execute("UPDATE seller_email_queue SET next_attempt_at=0")
        with patch.object(server, "send_email") as send:
            server.deliver_seller_emails()
        self.assertEqual(send.call_count, 1)
        self.assertTrue(all(row["sent_at"] for row in self.rows()))

    def test_buyer_does_not_get_seller_emails(self):
        self.handler.signup({**self.data, "role": "buyer"})
        self.assertEqual(self.rows(), [])

    def test_missing_otp_does_not_queue_emails(self):
        with patch.object(server, "verify_email_otp_token", return_value=False):
            with self.assertRaises(PermissionError):
                self.handler.signup(self.data)
        self.assertEqual(self.rows(), [])

    def test_duplicate_signup_does_not_queue_again(self):
        self.handler.signup(self.data)
        with self.assertRaises(Exception):
            self.handler.signup(self.data)
        self.assertEqual(len(self.rows()), 2)

    def test_missing_provider_keeps_queue_pending(self):
        self.handler.signup(self.data)
        with patch.object(server, "RESEND_API_KEY", ""), patch.object(server, "send_email") as send:
            server.deliver_seller_emails()
        send.assert_not_called()
        self.assertTrue(all(row["sent_at"] == 0 for row in self.rows()))


if __name__ == "__main__":
    unittest.main()
