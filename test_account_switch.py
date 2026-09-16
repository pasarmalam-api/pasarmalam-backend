import os
import tempfile
import unittest
from unittest.mock import patch
import server


class AccountSwitchTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        env = patch.multiple(server, DB_PATH=os.path.join(temp.name, 'test.sqlite'), USE_POSTGRES=False)
        env.start()
        self.addCleanup(env.stop)
        server.init_db()
        self.h = object.__new__(server.Handler)
        with server.connect() as con:
            self.buyer = dict(con.execute('SELECT * FROM users WHERE id=1').fetchone())
        self.token = server.make_token(self.buyer)
        self.h.headers = {'Authorization': 'Bearer ' + self.token}
        reply = patch.object(server, 'send_json')
        self.reply = reply.start()
        self.addCleanup(reply.stop)
        self.details = dict(name='Buyer Name', phone='+60123456789', address='Shop address',
                            shop_name='New Shop', shop_category='Food', identity_type='Passport',
                            identity_number='P123', bank_name='Bank', bank_account_name='Buyer Name',
                            bank_account_number='12345678')

    def result(self):
        return self.reply.call_args.args[2]

    def test_prefill_only_own_account(self):
        self.h.seller_onboarding()
        self.assertEqual(self.result()['profile']['email'], self.buyer['email'])
        self.assertNotIn('password', self.result()['profile'])

    def test_submission_preserves_identity_and_shopping(self):
        self.h.seller_onboarding(dict(self.details, email='attacker@example.com', user_id=2, seller_status='approved'))
        self.assertEqual(self.result()['seller_status'], 'pending')
        with server.connect() as con:
            row = con.execute('SELECT * FROM users WHERE id=1').fetchone()
            self.assertEqual(row['email'], self.buyer['email'])
            self.assertEqual(row['password'], self.buyer['password'])
            self.assertEqual(row['role'], 'seller')
            self.assertEqual(con.execute('SELECT COUNT(*) FROM seller_email_queue WHERE user_id=1').fetchone()[0], 2)
            self.assertEqual(con.execute("SELECT COUNT(*) FROM notifications WHERE role='buyer' AND user_id=1 AND title='Seller profile complete'").fetchone()[0], 1)
        self.assertEqual(self.h.current_user()['role'], 'buyer')
        self.h.get_buyer_profile()
        self.assertEqual(self.result()['user']['id'], 1)
        self.h.switch_role({'role':'seller'})
        self.assertTrue(self.result()['onboarding_required'])
        with self.assertRaises(PermissionError): self.h.require_user('seller')

    def test_repeat_submission_does_not_duplicate_or_edit(self):
        self.h.seller_onboarding(self.details)
        self.h.seller_onboarding(dict(self.details, shop_name='Overwrite'))
        self.assertEqual(self.result()['profile']['shop_name'], 'New Shop')
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT COUNT(*) FROM seller_email_queue WHERE user_id=1').fetchone()[0], 2)

    def test_approved_round_trip_and_profile_update(self):
        self.h.seller_onboarding(self.details)
        with server.connect() as con: con.execute("UPDATE users SET seller_status='approved' WHERE id=1")
        self.h.switch_role({'role':'seller'})
        self.h.headers['Authorization'] = 'Bearer ' + self.result()['token']
        self.assertEqual(self.h.current_user()['role'], 'seller')
        self.h.switch_role({'role':'buyer'})
        self.h.headers['Authorization'] = 'Bearer ' + self.result()['token']
        self.assertEqual(self.h.current_user()['role'], 'buyer')
        self.h.update_profile({'name':'Updated Buyer'})
        self.assertEqual(self.result()['user']['role'], 'buyer')
        self.assertEqual(server.parse_token(self.result()['token'])['role'], 'buyer')

    def test_validation_and_authentication(self):
        for payload in ({}, dict(self.details, bank_name=''), dict(self.details, shop_category='Invalid')):
            with self.assertRaises(ValueError): self.h.seller_onboarding(payload)
        with self.assertRaises(PermissionError): self.h.switch_role({'role':'admin'})
        self.h.headers = {}
        with self.assertRaises(PermissionError): self.h.seller_onboarding(self.details)

    def test_pending_seller_can_login_as_buyer_only(self):
        self.h.seller_onboarding(self.details)
        with server.connect() as con: con.execute('UPDATE users SET password=? WHERE id=1', (server.hash_password('Password123'),))
        credentials = {'email':self.buyer['email'], 'password':'Password123'}
        self.h.login(credentials)
        self.assertEqual(self.reply.call_args.args[1], 403)
        self.h.login(dict(credentials, role='buyer'))
        self.assertEqual(self.result()['user']['role'], 'buyer')

    def test_suspension_and_revocation(self):
        self.h.seller_onboarding(self.details)
        with server.connect() as con: con.execute("UPDATE users SET seller_status='approved' WHERE id=1")
        self.h.switch_role({'role':'seller'})
        self.h.headers['Authorization'] = 'Bearer ' + self.result()['token']
        with server.connect() as con: con.execute("UPDATE users SET seller_status='rejected' WHERE id=1")
        self.assertIsNone(self.h.current_user())
        self.h.headers['Authorization'] = 'Bearer ' + self.token
        self.assertEqual(self.h.current_user()['role'], 'buyer')
        with server.connect() as con: con.execute("UPDATE users SET status='suspended' WHERE id=1")
        self.assertIsNone(self.h.current_user())


if __name__ == '__main__':
    unittest.main()
