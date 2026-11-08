import sqlite3
import unittest
import ast
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import cod_policy


class CodPolicyTests(unittest.TestCase):
    def setUp(self):
        self.con = sqlite3.connect(':memory:')
        self.addCleanup(self.con.close)
        self.con.execute('CREATE TABLE orders(id INTEGER PRIMARY KEY,buyer_id INTEGER,payment_method TEXT,payment_status TEXT,order_status TEXT)')
        self.con.execute("INSERT INTO orders VALUES(1,7,'Billplz','paid','completed')")
        self.user = {'id': 7, 'phone': '01112345678'}
        self.product = {'selling_mode': 'retail'}
        self.data = {'logistics_method': 'PM Express', 'buyer_phone': '+601112345678',
                     'address': 'Unit 1, Jalan Test, 63000 Cyberjaya',
                     'coordinates': {'lat': 2.92, 'lng': 101.65}, 'location_confirmed': True}
        self.env = {'PM_COD_ENABLED': 'true', 'PM_COD_MAX_TOTAL': '100',
                    'PM_COD_AREAS': '[[2.9,101.6,3.0,101.7]]',
                    'PM_COD_VERIFIED_BUYERS': '{"7":"601112345678"}'}

    def result(self, total=100):
        return cod_policy.eligibility(self.con, self.user, self.product, self.data, total, self.env)

    def test_eligible_and_boundary(self):
        self.assertTrue(self.result()['eligible'])
        self.assertFalse(self.result(100.01)['eligible'])

    def test_disabled_and_bad_config(self):
        for key, value in [('PM_COD_ENABLED', ''), ('PM_COD_MAX_TOTAL', 'NaN'),
                           ('PM_COD_AREAS', '[]'), ('PM_COD_AREAS', '[null]'),
                           ('PM_COD_VERIFIED_BUYERS', '[]')]:
            with self.subTest(key=key, value=value):
                previous = self.env[key]
                self.env[key] = value
                self.assertFalse(self.result()['eligible'])
                self.env[key] = previous

    def test_prepaid_types(self):
        for mode in ('bulk', 'factory'):
            self.product['selling_mode'] = mode
            self.assertFalse(self.result()['eligible'])

    def test_courier_and_area(self):
        self.data['logistics_method'] = 'Lalamove Segera'
        self.assertFalse(self.result()['eligible'])
        self.data['logistics_method'] = 'PM Express'
        self.data['coordinates']['lat'] = 4
        self.assertFalse(self.result()['eligible'])

    def test_phone_and_address(self):
        for key, value in [('buyer_phone', '01199999999'), ('address', ''), ('location_confirmed', False)]:
            original = self.data[key]
            self.data[key] = value
            self.assertFalse(self.result()['eligible'])
            self.data[key] = original
        self.user['phone'] = '01199999999'
        self.assertFalse(self.result()['eligible'])

    def test_new_customer(self):
        self.con.execute('DELETE FROM orders')
        self.assertFalse(self.result()['eligible'])

    def test_outstanding_and_cancelled_cod(self):
        for status in ('placed', 'cancelled'):
            self.con.execute('DELETE FROM orders WHERE id=2')
            self.con.execute("INSERT INTO orders VALUES(2,7,'Pay on Arrival','unpaid',?)", (status,))
            self.assertFalse(self.result()['eligible'])

    def test_invalid_amounts(self):
        for amount in (0, -1, float('nan'), float('inf')):
            self.assertFalse(self.result(amount)['eligible'])

    def test_direct_checkout_bypass_is_rejected_and_quote_rolled_back(self):
        source = ast.parse(Path('server.py').read_text(encoding='utf-8-sig'))
        handler = next(node for node in source.body if isinstance(node, ast.ClassDef) and node.name == 'Handler')
        method = next(node for node in handler.body if isinstance(node, ast.FunctionDef) and node.name == 'checkout')
        self.con.execute('CREATE TABLE delivery_quotes(used INTEGER)')
        self.con.execute('INSERT INTO delivery_quotes VALUES(0)')
        self.con.commit()
        def consume(*args):
            self.con.execute('UPDATE delivery_quotes SET used=1')
            return 10.0, {}
        namespace = {'cod_policy': cod_policy, 'USE_POSTGRES': False,
                     'connect': lambda: self.con, 'delivery': SimpleNamespace(consume=consume)}
        exec(compile(ast.Module(body=[method], type_ignores=[]), 'server.py', 'exec'), namespace)
        user = dict(self.user, name='Test Buyer')
        product = dict(self.product, price=95)
        fake = SimpleNamespace(require_user=lambda role: user,
                               validate_checkout_payload=lambda *args: (product, 1, self.data['address'], 'Pay on Arrival', self.data['buyer_phone']))
        with patch.dict('os.environ', self.env, clear=True):
            with self.assertRaisesRegex(ValueError, 'COD order limit'):
                namespace['checkout'](fake, dict(self.data, payment_method='Pay on Arrival'))
        self.assertEqual(self.con.execute('SELECT used FROM delivery_quotes').fetchone()[0], 0)
        self.assertEqual(self.con.execute('SELECT COUNT(*) FROM orders').fetchone()[0], 1)


if __name__ == '__main__':
    unittest.main()
