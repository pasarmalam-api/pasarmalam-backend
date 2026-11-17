import json
import unittest
from unittest.mock import patch
import server
from test_billplz_verification import BillplzVerification


class BillplzCardProfile(BillplzVerification):
    def setUp(self):
        super().setUp()
        for name, value in [('BILLPLZ_CARD_API_KEY', 'card-key'), ('BILLPLZ_CARD_COLLECTION_ID', 'card-collection'), ('BILLPLZ_CARD_X_SIGNATURE_KEY', 'card-signature')]:
            setting = patch.object(server, name, value)
            setting.start()
            self.addCleanup(setting.stop)

    def test_new_bills_use_card_account_old_bills_keep_original(self):
        self.assertEqual(server.billplz_profile(new_bill=True), ('card-key', 'card-collection', 'card-signature'))
        self.assertEqual(server.billplz_profile(json.dumps({'collection_id': 'collection'})), ('fake', 'collection', ''))
        self.assertEqual(server.billplz_profile(json.dumps({'collection_id': 'card-collection'})), ('card-key', 'card-collection', 'card-signature'))

    def test_partial_card_configuration_fails_closed(self):
        for name in ('BILLPLZ_CARD_API_KEY', 'BILLPLZ_CARD_COLLECTION_ID', 'BILLPLZ_CARD_X_SIGNATURE_KEY'):
            with patch.object(server, name, ''):
                with self.assertRaises(ValueError):
                    server.billplz_profile(new_bill=True)

    def test_unknown_account_is_rejected_before_provider_request(self):
        with server.connect() as con:
            con.execute('UPDATE payments SET raw_response=? WHERE order_id=?', (json.dumps({'collection_id': 'unknown'}), self.oid))
        with self.assertRaises(ValueError):
            self.h.verify_billplz_bill('bill-test', self.buyer)
        self.gateway.assert_not_called()

    def test_card_bill_uses_card_key_and_requires_card_signature(self):
        with server.connect() as con:
            con.execute('UPDATE payments SET raw_response=? WHERE order_id=?', (json.dumps({'collection_id': 'card-collection'}), self.oid))
        self.gateway.return_value = {**self.raw, 'collection_id': 'card-collection'}
        with self.assertRaises(PermissionError):
            self.h.billplz_callback({'id': 'bill-test', 'paid': 'true'})
        self.gateway.assert_not_called()
        self.h.verify_billplz_bill('bill-test', self.buyer)
        self.gateway.assert_called_once_with('/api/v3/bills/bill-test', api_key='card-key')

    def test_options_do_not_expose_credentials(self):
        self.h.payment_options()
        reply = self.reply.call_args.args[2]
        self.assertEqual(reply, {'online': {'available': True, 'card': True}})
        self.assertNotIn('card-key', json.dumps(reply))

    def test_create_uses_new_collection_and_bulk_factory_stay_bank_only(self):
        product = {'id': 1, 'seller_id': 1, 'price': 20, 'selling_mode': 'retail', 'shipping_type': 'Pickup'}
        with patch.object(self.h, 'require_user', return_value=self.buyer), patch.object(self.h, 'validate_checkout_payload', return_value=(product, 1, 'Address', 'Billplz', '0123456789')), patch.object(server.delivery, 'consume', return_value=(0, {})), patch.object(self.h, 'attach_delivery'), patch.object(server, 'post_billplz', return_value={'id': 'new-card-bill', 'url': 'https://www.billplz.com/bills/new-card-bill', 'collection_id': 'card-collection'}) as post:
            self.h.create_billplz_payment({})
            self.assertEqual(post.call_args.kwargs, {'api_key': 'card-key'})
            self.assertEqual(post.call_args.args[1]['collection_id'], 'card-collection')
            post.reset_mock()
            for mode in ('bulk', 'factory'):
                product['selling_mode'] = mode
                with self.assertRaises(ValueError):
                    self.h.create_billplz_payment({})
            post.assert_not_called()


if __name__ == '__main__':
    unittest.main()
