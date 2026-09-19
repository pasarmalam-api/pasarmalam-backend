import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch, Mock
from urllib.parse import urlparse, parse_qs
import easyparcel as ep
import server


class OAuthTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = self.temp.name + '/test.db'
        def connect():
            con = sqlite3.connect(self.path)
            con.row_factory = sqlite3.Row
            return server.DbConnection(con)
        self.connect = connect
        with connect() as con:
            con.execute('CREATE TABLE users (id INTEGER PRIMARY KEY,role TEXT,status TEXT)')
            con.execute("INSERT INTO users VALUES (3,'admin','active')")
        p = patch.dict(os.environ, EASYPARCEL_CLIENT_ID='test-id', EASYPARCEL_CLIENT_SECRET='test-secret', PUBLIC_BASE_URL='https://example.test')
        p.start()
        self.addCleanup(p.stop)
        self.tokens = dict(access_token='private-access', refresh_token='private-refresh', expires_in=3600)

    def flow(self):
        url = ep.start(self.connect, 3)
        ticket = parse_qs(urlparse(url).query)['ticket'][0]
        login, browser = ep.launch(self.connect, ticket)
        state = parse_qs(urlparse(login).query)['state'][0]
        self.assertEqual(urlparse(login).netloc, 'api.easyparcel.com')
        return ticket, {'state':[state], 'code':['private-code']}, ep.COOKIE + '=' + browser

    def test_success_encryption_status_and_replay(self):
        ticket, query, cookie = self.flow()
        with patch.object(ep, 'exchange', return_value=self.tokens) as exchange:
            ep.finish(self.connect, query, cookie)
            exchange.assert_called_once_with('private-code', query['state'][0])
            with self.assertRaises(ep.ConnectionError):
                ep.finish(self.connect, query, cookie)
        with self.connect() as con:
            row = con.execute('SELECT * FROM easyparcel_connection').fetchone()
            self.assertNotIn('private-', row['encrypted_tokens'])
            self.assertEqual(json.loads(ep.cipher().decrypt(row['encrypted_tokens'].encode())), self.tokens)
        status = ep.status(self.connect)
        self.assertTrue(status['connected'])
        self.assertFalse(status['booking_enabled'])
        self.assertNotIn('private-', str(status))
        with self.assertRaises(ep.ConnectionError):
            ep.launch(self.connect, ticket)

    def test_wrong_browser_missing_duplicate_and_expired_state(self):
        _, query, cookie = self.flow()
        with patch.object(ep, 'exchange') as exchange:
            for bad, header in (({},cookie), ({**query,'state':['x','y']},cookie), (query,''), (query,ep.COOKIE+'=wrong')):
                with self.assertRaises(ep.ConnectionError):
                    ep.finish(self.connect, bad, header)
            with self.connect() as con:
                con.execute('UPDATE easyparcel_states SET expires_at=0')
            with self.assertRaises(ep.ConnectionError):
                ep.finish(self.connect, query, cookie)
            exchange.assert_not_called()

    def test_denied_permission_and_disabled_admin(self):
        _, query, cookie = self.flow()
        with patch.object(ep, 'exchange') as exchange:
            with self.assertRaises(ep.ConnectionError):
                ep.finish(self.connect, {**query,'error':['access_denied']}, cookie)
            exchange.assert_not_called()
        _, query, cookie = self.flow()
        with self.connect() as con:
            con.execute("UPDATE users SET status='suspended'")
        with self.assertRaises(ep.ConnectionError):
            ep.finish(self.connect, query, cookie)

    def test_failure_does_not_replace_connection(self):
        _, query, cookie = self.flow()
        with patch.object(ep, 'exchange', return_value=self.tokens):
            ep.finish(self.connect, query, cookie)
        _, query, cookie = self.flow()
        with patch.object(ep, 'exchange', side_effect=ep.ConnectionError('Unavailable')):
            with self.assertRaises(ep.ConnectionError):
                ep.finish(self.connect, query, cookie)
        self.assertTrue(ep.status(self.connect)['connected'])

    def test_missing_credentials_and_rotation(self):
        with patch.dict(os.environ, EASYPARCEL_CLIENT_SECRET=''):
            self.assertFalse(ep.status(self.connect)['configured'])
            with self.assertRaises(ep.ConnectionError):
                ep.start(self.connect, 3)
        _, query, cookie = self.flow()
        with patch.object(ep, 'exchange', return_value=self.tokens):
            ep.finish(self.connect, query, cookie)
        with patch.dict(os.environ, EASYPARCEL_CLIENT_SECRET='rotated-secret'):
            self.assertFalse(ep.status(self.connect)['connected'])

    def test_exchange_contract_and_error_redaction(self):
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.read.return_value = json.dumps({**self.tokens,'token_type':'Bearer'}).encode()
        opener = Mock()
        opener.open.return_value = response
        with patch.object(ep.urllib.request, 'build_opener', return_value=opener):
            self.assertEqual(ep.exchange('code', 'state'), self.tokens)
            request = opener.open.call_args.args[0]
            self.assertEqual(request.full_url, ep.TOKEN)
            self.assertEqual(parse_qs(request.data.decode())['redirect_uri'], ['https://example.test'+ep.PREFIX+'/callback'])
            opener.open.side_effect = ValueError('private-secret')
            with self.assertRaises(ep.ConnectionError) as error:
                ep.exchange('code','state')
            self.assertNotIn('private-secret', str(error.exception))

    def test_admin_only(self):
        handler = object.__new__(server.Handler)
        for role in ('buyer','seller'):
            handler.current_user = lambda: {'id':3,'role':role}
            with self.assertRaises(PermissionError):
                handler.easyparcel_admin(start=True)


if __name__ == '__main__':
    unittest.main()
