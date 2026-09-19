import io
import unittest
from unittest.mock import Mock

from server import Handler


class EasyParcelCallbackTests(unittest.TestCase):
    def handler(self, query=''):
        handler = object.__new__(Handler)
        handler.path = '/api/integrations/easyparcel/callback' + query
        handler.wfile = io.BytesIO()
        handler.send_response = Mock()
        handler.send_header = Mock()
        handler.end_headers = Mock()
        return handler

    def test_registration_page(self):
        handler = self.handler()
        handler.easyparcel_callback()
        handler.send_response.assert_called_once_with(200)
        handler.send_header.assert_any_call('Cache-Control', 'no-store')
        handler.send_header.assert_any_call('Referrer-Policy', 'no-referrer')
        self.assertIn(b'not enabled yet', handler.wfile.getvalue())

    def test_unsolicited_authorization_fails_closed_without_echo(self):
        for query in ('?code=secret-code&state=secret-state', '?error=access_denied', '?code=%3Cscript%3E'):
            handler = self.handler(query)
            handler.easyparcel_callback()
            handler.send_response.assert_called_once_with(503)
            self.assertNotIn(b'secret-code', handler.wfile.getvalue())
            self.assertNotIn(b'<script>', handler.wfile.getvalue())

    def test_request_log_redacts_query(self):
        handler = self.handler('?code=secret-code&state=secret-state')
        handler.log_message = Mock()
        handler.log_request(503)
        self.assertNotIn('secret', str(handler.log_message.call_args))


if __name__ == '__main__':
    unittest.main()
