import ast
import pathlib
import re
import sqlite3
import unittest

# Exercise the real helper without starting the server or touching its database.
tree = ast.parse(pathlib.Path(__file__).with_name('server.py').read_text(encoding='utf-8-sig'))
fn = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'campaign_discount')
scope = {'re': re}
exec(compile(ast.Module(body=[fn], type_ignores=[]), 'server.py', 'exec'), scope)
campaign_discount = scope['campaign_discount']

class DiscountTests(unittest.TestCase):
    def setUp(self):
        self.con = sqlite3.connect(':memory:')
        self.con.row_factory = sqlite3.Row
        self.con.execute('CREATE TABLE campaigns (id INTEGER, seller_id INTEGER, name TEXT, type TEXT, value TEXT, status TEXT)')

    def tearDown(self):
        self.con.close()

    def check_value(self, value, subtotal=100):
        self.con.execute('DELETE FROM campaigns')
        self.con.execute("INSERT INTO campaigns VALUES (1,5,'SAVE','voucher',?,'active')", (value,))
        return campaign_discount(self.con, 5, 'SAVE', subtotal)[0]

    def test_fixed_and_minimum(self):
        self.assertEqual(self.check_value('RM5 above RM50'), 5)
        with self.assertRaisesRegex(ValueError, 'Minimum purchase'):
            self.check_value('RM5 above RM50', 49)

    def test_percent_and_cap(self):
        self.assertEqual(self.check_value('10% off', 50), 5)
        self.assertEqual(self.check_value('10%', 50), 5)
        self.assertEqual(self.check_value('RM20', 10), 10)

    def test_invalid(self):
        for value in ['-5', '0', '101%', 'RM5 plus RM50', 'NaN', '']:
            with self.assertRaises(ValueError, msg=value):
                self.check_value(value)

    def test_seller_scope(self):
        self.check_value('5')
        with self.assertRaisesRegex(ValueError, 'not found'):
            campaign_discount(self.con, 6, 'SAVE', 100)

if __name__ == '__main__':
    unittest.main()
