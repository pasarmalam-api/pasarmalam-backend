import hashlib
import hmac
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import server


class BillplzVerification(unittest.TestCase):
    def setUp(self):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
        for key,value in [('DB_PATH',str(Path(temp.name)/'test.db')),('USE_POSTGRES',False),('BILLPLZ_API_KEY','fake'),('BILLPLZ_COLLECTION_ID','collection'),('BILLPLZ_X_SIGNATURE_KEY','')]:
            p=patch.object(server,key,value);p.start();self.addCleanup(p.stop)
        server.init_db()
        self.h=object.__new__(server.Handler);self.h.headers={}
        self.reply=patch.object(server,'send_json').start();self.addCleanup(patch.stopall)
        self.raw={'id':'bill-test','collection_id':'collection','paid':True,'amount':2000,'paid_amount':2000,'email':'private@example.test'}
        self.gateway=patch.object(server,'get_billplz',return_value=self.raw).start()
        with server.connect() as con:
            self.buyer=dict(con.execute("SELECT * FROM users WHERE role='buyer' LIMIT 1").fetchone())
            self.oid=con.execute("INSERT INTO orders (buyer_id,buyer_name,product_id,total,logistics_method,logistics_fee,created_at) VALUES (?,'Buyer',1,20,'Pickup',0,?)",(self.buyer['id'],server.now())).lastrowid
            con.execute("INSERT INTO payments (order_id,provider,bill_code,amount,status,created_at,updated_at) VALUES (?,'Billplz','bill-test',20,'pending',?,?)",(self.oid,server.now(),server.now()))

    def test_return_flag_does_not_mark_paid(self):
        self.gateway.return_value={**self.raw,'paid':False,'paid_amount':0}
        self.h.billplz_return({'id':['bill-test'],'paid':['true']})
        with server.connect() as con:self.assertNotEqual(con.execute('SELECT payment_status FROM orders WHERE id=?',(self.oid,)).fetchone()[0],'paid')

    def test_identity_collection_amount_mismatch_rejected(self):
        for delta in ({'id':'other'},{'collection_id':'other'},{'amount':1},{'paid_amount':1}):
            self.gateway.return_value={**self.raw,**delta}
            with self.assertRaises(ValueError):self.h.verify_billplz_bill('bill-test')

    def test_missing_signature_fails_when_configured(self):
        with patch.object(server,'BILLPLZ_X_SIGNATURE_KEY','required'):
            with self.assertRaises(PermissionError):self.h.billplz_callback({'id':'bill-test','paid':'true'})
        self.gateway.assert_not_called()

    def test_unsigned_callback_without_signature_mode_still_verified(self):
        self.h.billplz_callback({'id':'bill-test','paid':'false'})
        self.gateway.assert_called_once()
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT payment_status FROM orders WHERE id=?',(self.oid,)).fetchone()[0],'paid')
            self.assertNotIn('private@example.test',con.execute('SELECT raw_response FROM payments WHERE order_id=?',(self.oid,)).fetchone()[0])

    def test_status_requires_owner_and_matching_order_before_network(self):
        with self.assertRaises(PermissionError):self.h.billplz_status({'id':['bill-test']})
        with self.assertRaises(PermissionError):self.h.verify_billplz_bill('bill-test',{'id':999,'role':'buyer'})
        with self.assertRaises(ValueError):self.h.verify_billplz_bill('bill-test',self.buyer,999)
        self.gateway.assert_not_called()
        self.h.headers={'Authorization':'Bearer '+server.make_token(self.buyer)}
        self.h.billplz_status({'id':['bill-test'],'order_id':[str(self.oid)]})
        self.assertNotIn('email',self.reply.call_args.args[2]['gateway'])

    def test_duplicate_success_preserves_terminal_state_and_stock(self):
        self.h.verify_billplz_bill('bill-test')
        with server.connect() as con:
            stock=con.execute('SELECT stock FROM products WHERE id=1').fetchone()[0]
            con.execute("UPDATE orders SET order_status='completed',escrow_status='released' WHERE id=?",(self.oid,))
        self.h.verify_billplz_bill('bill-test')
        with server.connect() as con:
            self.assertEqual(con.execute('SELECT stock FROM products WHERE id=1').fetchone()[0],stock)
            self.assertEqual(con.execute('SELECT order_status FROM orders WHERE id=?',(self.oid,)).fetchone()[0],'completed')

    def test_signature_sorts_full_pairs_and_normalizes_booleans(self):
        data={'paid':True,'paid_at':'time','id':'bill'}
        data['x_signature']=hmac.new(b'key',b'idbill|paid_attime|paidtrue',hashlib.sha256).hexdigest()
        self.assertTrue(server.verify_billplz_signature(data,'key'))

    def test_disabled_legacy_payment_cannot_bypass_billplz_verification(self):
        self.h.toyyibpay_callback({'order_id':self.oid,'status':'1'})
        self.assertEqual(self.reply.call_args.args[1],503)
        with server.connect() as con:self.assertEqual(con.execute('SELECT payment_status FROM orders WHERE id=?',(self.oid,)).fetchone()[0],'unpaid')


if __name__=='__main__':unittest.main()
