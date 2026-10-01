import os
import tempfile
import unittest
from unittest.mock import patch

import server
from buyer_address import registration_address


class BuyerAddressTest(unittest.TestCase):
    def setUp(self):
        self.fields = dict(street='Jalan Perdana, CBD Perdana 3, Cyber 12',
                           unit='F-LG-R5', postcode='63000', city='Cyberjaya', state='Selangor')

    def test_complete_address(self):
        self.assertEqual(registration_address({'address_fields': self.fields}),
                         'F-LG-R5, Jalan Perdana, CBD Perdana 3, Cyber 12, 63000 Cyberjaya, Selangor, Malaysia')

    def test_missing_or_invalid_fields(self):
        for key, value in [('street', ''), ('postcode', 'prin'), ('postcode', '1234'),
                           ('postcode', '123456'), ('city', ''), ('city', '123'),
                           ('state', ''), ('state', 'invalid')]:
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                registration_address({'address_fields': {**self.fields, key: value}})
        with self.assertRaises(ValueError):
            registration_address({'address': 'present 7 putrajaya'})

    def test_signup_saves_canonical_address_not_untrusted_flat_text(self):
        with tempfile.TemporaryDirectory() as directory, patch.multiple(
                server, DB_PATH=os.path.join(directory, 'test.db'), USE_POSTGRES=False):
            server.init_db()
            handler = object.__new__(server.Handler)
            payload = dict(role='buyer', name='Test Buyer', email='address-test@example.com',
                           phone='01123456789', password='test-password-123', address='wrong',
                           address_fields=self.fields, email_otp_token='test')
            with patch.object(server, 'verify_email_otp_token', return_value=True), patch.object(server, 'send_json') as send:
                handler.signup(payload)
            user = send.call_args.args[2]['user']
            self.assertEqual(user['address'], registration_address(payload))
            with server.connect() as con:
                row = con.execute('SELECT address FROM users WHERE id=?', (user['id'],)).fetchone()
            self.assertEqual(row['address'], user['address'])
            handler.require_user = lambda: user
            changed = {**self.fields, 'street': '12 Jalan Baru', 'unit': '', 'postcode': '50450', 'city': 'Kuala Lumpur', 'state': 'Kuala Lumpur'}
            with patch.object(server, 'send_json') as updated:
                handler.update_profile({'address_fields': changed, 'address': 'ignored'})
            self.assertEqual(updated.call_args.args[2]['user']['address'], registration_address({'address_fields': changed}))
            with self.assertRaises(ValueError):
                handler.update_profile({'address_fields': {**changed, 'postcode': 'wrong'}})
            with self.assertRaises(ValueError):
                handler.signup({**payload, 'address_fields': {**self.fields, 'postcode': ''}})


if __name__ == '__main__':
    unittest.main()
