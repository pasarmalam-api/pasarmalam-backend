import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import server


class AccountDeletionTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        for name, value in [('DB_PATH', str(Path(temp.name) / 'test.db')), ('USE_POSTGRES', False)]:
            p = patch.object(server, name, value)
            p.start()
            self.addCleanup(p.stop)
        server.init_db()
        self.h = object.__new__(server.Handler)
        self.h.headers = {}
        self.reply = patch.object(server, 'send_json').start()
        self.addCleanup(patch.stopall)
        with server.connect() as con:
            cur = con.execute("INSERT INTO users (role,name,email,password,status,seller_status,created_at) VALUES ('buyer','Privacy test','privacy@example.test',?,'active','not_applicable',?)",
                              (server.hash_password('test-password'), server.now()))
            self.user = dict(con.execute('SELECT * FROM users WHERE id=?', (cur.lastrowid,)).fetchone())
            self.admin = dict(con.execute("SELECT * FROM users WHERE role='admin' LIMIT 1").fetchone())

    def auth(self, user):
        self.h.headers = {'Authorization': 'Bearer ' + server.make_token(user)}

    def submit(self):
        self.h.request_account_deletion({'confirm': True})
        return self.reply.call_args.args[2]['request']

    def test_authenticated_request_is_durable_and_idempotent(self):
        self.auth(self.user)
        first = self.submit()
        self.assertEqual(first, self.submit())
        self.assertEqual(first['due_at'] - first['requested_at'], 30 * 86400)
        self.assertNotIn('email', first)
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT COUNT(*) FROM account_deletion_requests').fetchone()[0], 1)
            self.assertEqual(con.execute("SELECT COUNT(*) FROM notifications WHERE type='privacy'").fetchone()[0], 1)
            self.assertIsNotNone(con.execute('SELECT id FROM users WHERE id=?', (self.user['id'],)).fetchone())

    def test_confirmation_and_auth_required(self):
        with self.assertRaises(PermissionError): self.submit()
        self.auth(self.user)
        with self.assertRaises(ValueError): self.h.request_account_deletion({'confirm': 'true'})

    def test_suspended_seller_can_verify_without_support(self):
        with server.connect() as con:
            con.execute("UPDATE users SET status='suspended',role='seller',seller_status='pending' WHERE id=?", (self.user['id'],))
        self.h.request_account_deletion({'email': self.user['email'], 'password': 'test-password', 'confirm': True})
        self.assertEqual(self.reply.call_args.args[2]['request']['status'], 'requested')
        with self.assertRaises(PermissionError):
            self.h.request_account_deletion({'email': self.user['email'], 'password': 'wrong', 'confirm': True})

    def test_admin_cannot_request_self_deletion(self):
        self.auth(self.admin)
        with self.assertRaises(PermissionError): self.submit()

    def test_user_id_in_payload_is_ignored(self):
        self.auth(self.user)
        self.h.request_account_deletion({'confirm': True, 'user_id': self.admin['id'], 'email': self.admin['email']})
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT user_id FROM account_deletion_requests').fetchone()[0], self.user['id'])

    def test_queue_is_admin_only(self):
        self.auth(self.user)
        with self.assertRaises(PermissionError): self.h.admin_account_deletions()
        with self.assertRaises(PermissionError): self.h.admin_account_deletions({'id': 1, 'status': 'completed'})

    def test_status_only_returns_own_request(self):
        self.auth(self.user)
        self.submit()
        self.h.account_deletion_status()
        self.assertEqual(self.reply.call_args.args[2]['request']['status'], 'requested')
        self.h.headers = {}
        with self.assertRaises(PermissionError): self.h.account_deletion_status()

    def test_completion_blocked_while_account_exists(self):
        self.auth(self.user)
        request = self.submit()
        self.auth(self.admin)
        data = {'id': request['id'], 'status': 'reviewing', 'note': 'Associated records are under review.'}
        self.h.admin_account_deletions(data)
        self.assertEqual(self.reply.call_args.args[2]['requests'][0]['status'], 'reviewing')
        with self.assertRaisesRegex(ValueError, 'Account still exists'):
            self.h.admin_account_deletions({**data, 'status': 'completed', 'data_reviewed': True, 'retention_reviewed': True, 'confirmation_sent': True})

    def test_manual_completion_requires_account_removal_and_all_confirmations(self):
        self.auth(self.user)
        request = self.submit()
        self.auth(self.admin)
        # Only an isolated synthetic account is removed in this test.
        with server.connect() as con: con.execute('DELETE FROM users WHERE id=?', (self.user['id'],))
        data = {'id': request['id'], 'status': 'completed', 'note': 'Data removed; retention reviewed; confirmation sent.', 'data_reviewed': True, 'retention_reviewed': True, 'confirmation_sent': True}
        for key in ('data_reviewed', 'retention_reviewed', 'confirmation_sent'):
            with self.assertRaises(ValueError): self.h.admin_account_deletions({**data, key: False})
        self.h.admin_account_deletions(data)
        row = self.reply.call_args.args[2]['requests'][0]
        self.assertEqual(row['status'], 'completed')
        self.assertEqual(row['email'], '')
        self.assertGreater(row['completed_at'], 0)
        with self.assertRaises(ValueError): self.h.admin_account_deletions(data)

    def purge_data(self):
        self.auth(self.user)
        request = self.submit()
        self.auth(self.admin)
        return {'action': 'purge', 'id': request['id'], 'confirm_email': self.user['email'],
                'confirm_purge': True, 'legacy_reviewed': True, 'retained_fields': [],
                'retention_reason': 'Verified accounting retention for completed transactions.',
                'retention_until': server.now() + 86400 * 365}

    def order(self, status='completed'):
        with server.connect() as con:
            return con.execute("INSERT INTO orders (buyer_id,buyer_name,product_id,total,logistics_method,logistics_fee,order_status,payment_status,escrow_status,address,delivery_data,created_at) VALUES (?,'Privacy test',1,20,'Pickup',0,?,'paid','released','Private address','private delivery',?)", (self.user['id'], status, server.now())).lastrowid

    def test_purge_removes_profile_content_and_preserves_other_accounts(self):
        old_token = server.make_token(self.user)
        data = self.purge_data()
        uid = self.user['id']
        with server.connect() as con:
            con.execute("INSERT INTO reviews (buyer_id,buyer_name,product_id,seller_id,rating,title,body,created_at) VALUES (?,'Privacy test',1,2,5,'Private title','Private body',?)", (uid,server.now()))
            con.execute("INSERT INTO messages (buyer_id,buyer_name,seller_name,product_id,sender_role,body,created_at) VALUES (?,'Privacy test','Other seller',1,'buyer','Private chat',?)",(uid,server.now()))
            con.execute('INSERT INTO wishlist (buyer_id,product_id,created_at) VALUES (?,1,?)',(uid,server.now()))
        self.h.admin_account_deletions(data)
        self.assertEqual(self.reply.call_args.args[2]['requests'][0]['status'], 'external_cleanup')
        with server.connect() as con:
            self.assertIsNone(con.execute('SELECT id FROM users WHERE id=?',(uid,)).fetchone())
            self.assertEqual(con.execute('SELECT COUNT(*) FROM reviews WHERE buyer_id=?',(uid,)).fetchone()[0],0)
            self.assertEqual(con.execute('SELECT COUNT(*) FROM messages WHERE buyer_id=?',(uid,)).fetchone()[0],0)
            self.assertEqual(con.execute('SELECT COUNT(*) FROM wishlist WHERE buyer_id=?',(uid,)).fetchone()[0],0)
            self.assertIsNotNone(con.execute('SELECT id FROM users WHERE id=?',(self.admin['id'],)).fetchone())
        self.h.headers={'Authorization':'Bearer '+old_token}
        self.assertIsNone(self.h.current_user())

    def test_order_redaction_and_late_callback_cannot_restore_data(self):
        oid=self.order()
        data=self.purge_data()
        self.h.admin_account_deletions(data)
        self.h.apply_payment_status(oid,'1','bill','',{'email':self.user['email']})
        with server.connect() as con:
            order=con.execute('SELECT * FROM orders WHERE id=?',(oid,)).fetchone()
            self.assertEqual(order['total'],20)
            self.assertEqual(order['order_status'],'completed')
            self.assertEqual(order['buyer_id'],0)
            self.assertEqual(order['address'],'')
            self.assertEqual(order['delivery_data'],'')

    def test_unresolved_order_blocks_erasure_not_request(self):
        self.order('shipped')
        data=self.purge_data()
        with self.assertRaisesRegex(ValueError,'Resolve order'):
            self.h.admin_account_deletions(data)
        with server.connect() as con:
            self.assertIsNotNone(con.execute('SELECT id FROM users WHERE id=?',(self.user['id'],)).fetchone())
            self.assertEqual(con.execute('SELECT COUNT(*) FROM deletion_cleanup').fetchone()[0],0)

    def test_retention_and_confirmation_guards(self):
        self.order()
        data=self.purge_data()
        for change in ({'retention_until':0},{'retained_fields':['password']},{'confirm_email':'wrong@example.test'}, {'legacy_reviewed':False}, {'legacy_reviews':[999]}):
            with self.assertRaises(ValueError): self.h.admin_account_deletions({**data,**change})

    def test_retained_identity_expires(self):
        self.order()
        data={**self.purge_data(),'retained_fields':['name']}
        self.h.admin_account_deletions(data)
        with server.connect() as con:
            self.assertIn('Privacy test',con.execute('SELECT retained_identity FROM deletion_cleanup').fetchone()[0])
            server.account_deletion.expire_identity(con,data['retention_until']+1)
            self.assertEqual(con.execute('SELECT retained_identity FROM deletion_cleanup').fetchone()[0],'{}')

    def test_seller_products_branches_quotes_removed(self):
        uid=self.user['id']
        with server.connect() as con:
            con.execute("UPDATE users SET role='seller',seller_status='approved' WHERE id=?",(uid,))
            pid=con.execute("INSERT INTO products (seller_id,name,shop,category,price,stock,condition,price_mode,created_at) VALUES (?,'Private product','Private shop','Food',10,5,'New','Fixed',?)",(uid,server.now())).lastrowid
            con.execute('INSERT INTO delivery_pickups (id,payload,updated_at) VALUES (?, ?, ?)',(uid,'{"address":"Private pickup"}',server.now()))
            con.execute('INSERT INTO delivery_quotes (id,buyer_id,context,quotation,expires_at) VALUES (?,1,?,?,?)',('purge-quote','{"seller_id":'+str(uid)+'}','{}',server.now()+300))
        self.h.admin_account_deletions(self.purge_data())
        with server.connect() as con:
            self.assertIsNone(con.execute('SELECT id FROM products WHERE id=?',(pid,)).fetchone())
            self.assertIsNone(con.execute('SELECT id FROM delivery_pickups WHERE id=?',(uid,)).fetchone())
            self.assertIsNone(con.execute("SELECT id FROM delivery_quotes WHERE id='purge-quote'").fetchone())


if __name__ == '__main__':
    unittest.main()
