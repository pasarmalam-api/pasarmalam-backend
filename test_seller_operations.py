import os
import tempfile
import unittest
from unittest.mock import patch
import server


class SellerOperationsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.env = patch.multiple(server, DB_PATH=os.path.join(self.temp.name, 'test.sqlite'), USE_POSTGRES=False)
        self.env.start()
        self.addCleanup(self.env.stop)
        server.init_db()
        self.h = object.__new__(server.Handler)
        self.h.path = '/api/notifications'
        self.seller = {'id':2, 'role':'seller', 'name':'Seller One', 'shop_name':'Shop One'}
        self.h.current_user = lambda: self.seller
        self.response = patch.object(server, 'send_json')
        self.reply = self.response.start()
        self.addCleanup(self.response.stop)
        with server.connect() as c:
            c.execute("UPDATE products SET seller_id=2 WHERE id=1")
            c.execute("UPDATE products SET seller_id=99 WHERE id<>1")

    def data(self):
        return self.reply.call_args.args[2]

    def test_products_only_own_shop(self):
        self.h.get_products({})
        self.assertEqual([p['id'] for p in self.data()['products']], [1])

    def test_create_edit_delete_product(self):
        payload={'name':'Camera','shop':'ignored','category':'Electronics','price':50,'stock':2,'condition':'New','price_mode':'Fixed'}
        self.h.create_product(payload)
        product_id=self.data()['id']
        self.h.product_by_id('PUT',f'/api/products/{product_id}',{'name':'Camera Two','stock':3})
        with server.connect() as c:
            row=c.execute('SELECT name,stock,shop FROM products WHERE id=?',(product_id,)).fetchone()
            self.assertEqual(tuple(row),('Camera Two',3,'Shop One'))
        self.h.product_by_id('DELETE',f'/api/products/{product_id}',{})
        with server.connect() as c:
            self.assertIsNone(c.execute('SELECT id FROM products WHERE id=?',(product_id,)).fetchone())

    def test_invalid_product_values(self):
        for value in ({'name':''},{'price':-1},{'price':float('nan')},{'stock':1.2},{'weight_kg':0}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.h.product_by_id('PUT','/api/products/1',value)

    def test_cannot_edit_other_shop(self):
        with self.assertRaises(PermissionError):
            self.h.product_by_id('PUT','/api/products/2',{'stock':1})

    def test_notifications_cannot_mark_another_seller(self):
        with server.connect() as c:
            server.create_notification(c,'seller',99,'Private','Private')
            other=c.execute("SELECT id FROM notifications WHERE user_id=99").fetchone()['id']
        self.h.mark_notifications_read({'notification_id':other})
        with server.connect() as c:
            self.assertEqual(c.execute('SELECT read_at FROM notifications WHERE id=?',(other,)).fetchone()['read_at'],0)

    def test_private_endpoints_require_authentication(self):
        self.h.current_user=lambda: None
        for call in (self.h.get_orders,self.h.get_returns,self.h.get_wallet,self.h.get_notifications,lambda:self.h.list_table('messages','messages')):
            with self.subTest(call=call),self.assertRaises(PermissionError):call()

    def test_chat_reply_uses_owned_conversation(self):
        with server.connect() as c:
            c.execute("INSERT INTO messages(product_id,buyer_name,seller_name,sender_role,body,created_at) VALUES(1,'Aina Buyer','Shop One','buyer','Hello',1)")
        self.h.create_message({'product_id':1,'buyer_name':'Aina Buyer','body':'Hello back','sender_role':'buyer'})
        with server.connect() as c:
            row=c.execute('SELECT sender_role,seller_name FROM messages ORDER BY id DESC LIMIT 1').fetchone()
            self.assertEqual(tuple(row),('seller','Shop One'))
        with self.assertRaises(PermissionError):self.h.create_message({'product_id':2,'body':'wrong shop'})

    def test_review_and_campaign_lists_are_scoped(self):
        for table in ('reviews','campaigns'):
            self.h.list_table(table,table)
            self.assertTrue(all(r['seller_id']==2 for r in self.data()[table]))

    def test_shipping_label_requires_owned_order(self):
        with self.assertRaises(PermissionError):self.h.awb({'order_id':999})

    def test_suspended_and_deleted_tokens_stop_working(self):
        h=object.__new__(server.Handler)
        h.headers={'Authorization':'Bearer '+server.make_token(self.seller)}
        with server.connect() as c:
            c.execute("UPDATE users SET status='active',seller_status='approved' WHERE id=2")
        self.assertIsNotNone(h.current_user())
        with server.connect() as c:c.execute("UPDATE users SET status='suspended' WHERE id=2")
        self.assertIsNone(h.current_user())
        with server.connect() as c:c.execute('DELETE FROM users WHERE id=2')
        self.assertIsNone(h.current_user())

    def test_support_create_and_list(self):
        self.h.create_support_ticket({'subject':'Upload failed','message':'Please help','category':'Technical'})
        self.h.get_support_tickets()
        self.assertEqual(self.data()['tickets'][0]['subject'],'Upload failed')

    def make_order(self, product_id=1, payment='paid'):
        with server.connect() as c:
            return c.execute("INSERT INTO orders(buyer_id,buyer_name,product_id,total,logistics_method,logistics_fee,payment_status,created_at) VALUES(1,'Aina Buyer',?,10,'Pickup',0,?,1)",(product_id,payment)).lastrowid

    def test_order_history_prevents_product_deletion(self):
        self.make_order()
        with self.assertRaisesRegex(ValueError,'history'):
            self.h.product_by_id('DELETE','/api/products/1',{})

    def test_shipping_label_paid_and_unpaid(self):
        paid=self.make_order()
        self.h.awb({'order_id':paid})
        self.assertIn('PM-AWB',self.data()['awb_label'])
        unpaid=self.make_order(payment='unpaid')
        with self.assertRaises(ValueError):self.h.awb({'order_id':unpaid})

    def test_returns_response_and_closed_lock(self):
        order_id=self.make_order()
        with server.connect() as c:
            rid=c.execute("INSERT INTO returns(order_id,buyer_name,reason,created_at) VALUES(?,'Aina Buyer','Size',1)",(order_id,)).lastrowid
        self.h.seller_respond_return({'return_id':rid,'seller_response':'Please return'})
        with server.connect() as c:c.execute("UPDATE returns SET dispute_status='closed' WHERE id=?",(rid,))
        with self.assertRaisesRegex(ValueError,'closed'):
            self.h.seller_respond_return({'return_id':rid,'seller_response':'Reopen'})


if __name__ == '__main__':
    unittest.main()
