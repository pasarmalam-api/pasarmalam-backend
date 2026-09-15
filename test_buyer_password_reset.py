import tempfile
import unittest
import re
from html import unescape
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from unittest.mock import patch
import server


class BuyerResetTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        for name, value in [('DB_PATH', str(Path(temp.name)/'test.db')), ('USE_POSTGRES', False), ('RESEND_API_KEY', 'test-only')]:
            p = patch.object(server, name, value); p.start(); self.addCleanup(p.stop)
        server.init_db()
        self.h = object.__new__(server.Handler)
        self.h.headers = {}
        self.email = 'reset@example.test'
        with server.connect() as con:
            c = con.execute("INSERT INTO users (role,name,phone,email,password,address,status,seller_status,created_at) VALUES ('buyer','Reset Buyer','0123',?,?,'KL','active','not_applicable',?)", (self.email,server.hash_password('old-password'),server.now()))
            self.user = dict(con.execute('SELECT * FROM users WHERE id=?',(c.lastrowid,)).fetchone())
        self.mail = patch.object(server, 'send_email').start()
        self.reply = patch.object(server, 'send_json').start()
        self.addCleanup(patch.stopall)

    def request(self):
        self.h.request_buyer_password_reset({'email':self.email.upper()})
        link = unescape(re.search('href="([^"]+)"',self.mail.call_args.args[2])[1])
        self.assertTrue(link.startswith(server.BUYER_APP_URL+'/password-reset.html#'))
        p = parse_qs(urlparse(link).fragment)
        return {'email':p['email'][0], 'token':p['token'][0], 'new_password':'new-password'}

    def test_complete_flow_and_revoke_session(self):
        old_token = server.make_token(self.user)
        data = self.request()
        with server.connect() as con:
            self.assertNotEqual(con.execute("SELECT code_hash FROM email_otps WHERE email=?",(self.email,)).fetchone()[0],data['token'])
        self.h.confirm_buyer_password_reset(data)
        self.h.headers={'Authorization':'Bearer '+old_token}
        self.assertIsNone(self.h.current_user())
        self.h.login({'email':self.email,'password':'old-password'})
        self.assertEqual(self.reply.call_args.args[1],401)
        self.h.login({'email':self.email,'password':'new-password'})
        self.assertEqual(self.reply.call_args.args[1],200)
        self.h.headers={'Authorization':'Bearer '+self.reply.call_args.args[2]['token']}
        self.assertEqual(self.h.current_user()['email'],self.email)
        with self.assertRaises(PermissionError): self.h.confirm_buyer_password_reset(data)

    def test_expired_and_invalid_links(self):
        data=self.request()
        with self.assertRaises(PermissionError): self.h.confirm_buyer_password_reset({**data,'token':'wrong'})
        with server.connect() as con: con.execute('UPDATE email_otps SET expires_at=0')
        with self.assertRaises(PermissionError): self.h.confirm_buyer_password_reset(data)

    def test_short_password_does_not_consume_link(self):
        data=self.request()
        with self.assertRaises(ValueError): self.h.confirm_buyer_password_reset({**data,'new_password':'short'})
        self.h.confirm_buyer_password_reset(data)

    def test_missing_account_generic_response(self):
        self.h.request_buyer_password_reset({'email':'missing@example.test'})
        self.mail.assert_not_called()
        self.assertTrue(self.reply.call_args.args[2]['ok'])

    def test_provider_failure_not_false_success(self):
        self.mail.side_effect=RuntimeError('offline')
        self.h.request_buyer_password_reset({'email':self.email})
        self.assertEqual(self.reply.call_args.args[1],503)
        with server.connect() as con: self.assertEqual(con.execute('SELECT COUNT(*) FROM email_otps WHERE email=?',(self.email,)).fetchone()[0],0)

    def test_missing_provider(self):
        with patch.object(server,'RESEND_API_KEY',''): self.h.request_buyer_password_reset({'email':self.email})
        self.assertEqual(self.reply.call_args.args[1],503)

    def test_cooldown_and_role_restriction(self):
        self.request(); self.h.request_buyer_password_reset({'email':self.email})
        self.assertEqual(self.mail.call_count,1)
        self.mail.reset_mock()
        self.h.request_buyer_password_reset({'email':'admin@pasarmalam.my'})
        self.mail.assert_not_called()

    def test_signup_otp_cannot_create_reset_token(self):
        with self.assertRaises(ValueError): self.h.send_email_otp({'email':self.email,'purpose':'buyer_password_reset'})
        with self.assertRaises(ValueError): self.h.verify_email_otp({'email':self.email,'purpose':'buyer_password_reset','code':'123456'})

    def test_profile_requires_login_and_has_no_sample_data(self):
        with self.assertRaises(PermissionError): self.h.get_buyer_profile()
        self.h.headers={'Authorization':'Bearer '+server.make_token(self.user)}
        self.h.get_buyer_profile()
        self.assertEqual(self.reply.call_args.args[2]['user']['email'],self.email)
        self.assertNotIn('password',self.reply.call_args.args[2]['user'])
        self.h.update_profile({'name':'Changed','phone':'01234','address':'New address','role':'admin'})
        self.assertEqual(self.reply.call_args.args[2]['user']['name'],'Changed')
        self.assertEqual(self.reply.call_args.args[2]['user']['role'],'buyer')

    def test_wishlist_is_scoped_and_removable(self):
        self.h.path='/api/wishlist'
        with server.connect() as con:
            product=con.execute('SELECT id FROM products LIMIT 1').fetchone()[0]
        payload={'product_id':product,'buyer_id':1}
        with patch.object(server,'read_json',return_value=payload):
            self.h.write_route('POST')
            self.assertEqual(self.reply.call_args.args[1],401)
            self.h.headers={'Authorization':'Bearer '+server.make_token(self.user)}
            self.h.write_route('POST');self.h.write_route('POST')
            self.h.get_wishlist()
            rows=self.reply.call_args.args[2]['wishlist']
            self.assertEqual(len(rows),1);self.assertEqual(rows[0]['buyer_id'],self.user['id'])
            self.h.write_route('DELETE');self.h.get_wishlist()
            self.assertEqual(self.reply.call_args.args[2]['wishlist'],[])

    def test_routes_use_real_reset_handlers(self):
        self.h.path='/api/auth/password-reset'
        with patch.object(server,'read_json',return_value={'email':self.email}): self.h.write_route('POST')
        self.mail.assert_called_once()
        self.assertNotIn('demo',str(self.reply.call_args))

    def test_uppercase_login_and_invalid_signup(self):
        self.h.login({'email':self.email.upper(),'password':'old-password'})
        self.assertEqual(self.reply.call_args.args[1],200)
        with self.assertRaises(ValueError): self.h.signup({'email':self.email,'password':'x'})


if __name__=='__main__': unittest.main()
