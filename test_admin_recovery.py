import ast
import pathlib
import types
import unittest
import urllib.parse
from unittest.mock import Mock


class AdminRecoveryTests(unittest.TestCase):
    def setup_handler(self, row):
        tree = ast.parse(pathlib.Path(__file__).with_name('server.py').read_text(encoding='utf-8'))
        handler = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == 'Handler')
        method = next(n for n in handler.body if isinstance(n, ast.FunctionDef) and n.name == 'send_admin_reset_email')
        connection = Mock()
        connection.execute.return_value.fetchone.return_value = row
        context = Mock()
        context.__enter__ = Mock(return_value=connection)
        context.__exit__ = Mock(return_value=False)
        namespace = dict(RESEND_API_KEY='test', connect=lambda: context,
                         make_admin_reset_token=Mock(return_value='test-token'),
                         ADMIN_APP_URL='https://bronze-kally-50.tiiny.site',
                         urllib=urllib, send_email=Mock(), send_json=Mock())
        exec(compile(ast.Module(body=[method], type_ignores=[]), '<reset-handler>', 'exec'), namespace)
        return namespace, types.MethodType(namespace['send_admin_reset_email'], object()), connection

    def test_staff_receives_own_link(self):
        ns, request, con = self.setup_handler({'id': 42, 'role': 'admin', 'email': 'staff@example.test'})
        request({'email': ' STAFF@example.test '})
        con.execute.assert_called_once_with('SELECT id, role, email FROM users WHERE LOWER(email) = ?', ('staff@example.test',))
        self.assertEqual(ns['send_email'].call_args.args[0], 'staff@example.test')
        self.assertIn('https://bronze-kally-50.tiiny.site/reset-admin.html?token=test-token', ns['send_email'].call_args.args[2])

    def test_unknown_and_non_admin_are_not_disclosed(self):
        messages = []
        for row in (None, {'id': 1, 'role': 'buyer', 'email': 'buyer@example.test'}):
            ns, request, _ = self.setup_handler(row)
            request({'email': 'buyer@example.test'})
            ns['send_email'].assert_not_called()
            messages.append(ns['send_json'].call_args.args[2])
        self.assertEqual(messages[0], messages[1])

    def test_invalid_email_and_unavailable_provider(self):
        ns, request, _ = self.setup_handler(None)
        with self.assertRaises(ValueError):
            request({'email': ''})
        ns['RESEND_API_KEY'] = ''
        with self.assertRaises(PermissionError):
            request({'email': 'staff@example.test'})
        ns['send_email'].assert_not_called()


if __name__ == '__main__':
    unittest.main()
