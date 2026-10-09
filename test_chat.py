import unittest
from unittest.mock import Mock, patch
import server
import chat
import test_seller_operations


class ChatTest(unittest.TestCase):
    setUp=test_seller_operations.SellerOperationsTest.setUp

    def test_roundtrip_identity_and_read_receipts(self):
        buyer={'id':1,'role':'buyer','name':'Aina Buyer'}
        with server.connect() as con:
            first=chat.send(con,buyer,{'product_id':1,'body':'Hello','buyer_id':999,'sender_role':'seller'},10,server.create_notification)
            reply=chat.send(con,self.seller,{'product_id':1,'buyer_id':1,'body':'Available'},11,server.create_notification)
            self.assertEqual(chat.listing(con,buyer)[0]['buyer_id'],1)
            self.assertEqual(chat.listing(con,buyer)[0]['sender_role'],'buyer')
            self.assertEqual(len(chat.listing(con,self.seller)),2)
            chat.read(con,buyer,{'product_id':1,'through_id':reply},12)
            self.assertEqual(con.execute('SELECT read_at FROM messages WHERE id=?',(reply,)).fetchone()[0],12)
            self.assertEqual(con.execute("SELECT read_at FROM notifications WHERE role='buyer' AND user_id=1").fetchone()[0],12)
            self.assertEqual(con.execute('SELECT read_at FROM messages WHERE id=?',(first,)).fetchone()[0],0)

    def test_same_name_does_not_grant_access(self):
        with server.connect() as con:
            chat.send(con,{'id':1,'role':'buyer'}, {'product_id':1,'body':'Private'},10,server.create_notification)
            other={'id':999,'role':'buyer','name':'Aina Buyer'}
            self.assertEqual(chat.listing(con,other),[])
            chat.read(con,other,{'product_id':1,'buyer_id':1,'through_id':999},20)
            self.assertEqual(con.execute('SELECT read_at FROM messages').fetchone()[0],0)
            with self.assertRaises(PermissionError):
                chat.send(con,{'id':999,'role':'seller'},{'product_id':1,'buyer_id':1,'body':'hack'},20,server.create_notification)

    def test_new_arrivals_remain_unread_and_legacy_quarantined(self):
        with server.connect() as con:
            con.execute("INSERT INTO messages(product_id,buyer_name,seller_name,sender_role,body,created_at) VALUES(1,'Aina Buyer','Shop','buyer','Legacy',1)")
            self.assertEqual(chat.listing(con,self.seller),[])
            with self.assertRaises(ValueError):
                chat.send(con,self.seller,{'product_id':1,'buyer_id':1,'body':'reply'},2,server.create_notification)
            buyer={'id':1,'role':'buyer'}
            first=chat.send(con,buyer,{'product_id':1,'body':'first'},10,server.create_notification)
            second=chat.send(con,buyer,{'product_id':1,'body':'second'},10,server.create_notification)
            chat.read(con,self.seller,{'product_id':1,'buyer_id':1,'through_id':first},11)
            self.assertEqual(con.execute('SELECT read_at FROM messages WHERE id=?',(second,)).fetchone()[0],0)
            self.assertEqual(con.execute('SELECT read_at FROM notifications WHERE target_url=?',(chat.target('seller',1,1,second),)).fetchone()[0],0)

    def test_message_validation_and_migration_idempotence(self):
        with server.connect() as con:
            chat.migrate(con,server.table_columns(con,'messages'))
            for body in ('','x'*4001):
                with self.assertRaises(ValueError):chat.send(con,{'id':1,'role':'buyer'},{'product_id':1,'body':body},1,server.create_notification)
            with self.assertRaises(PermissionError):chat.listing(con,{'id':3,'role':'admin'})

    def test_block_and_report_authorization(self):
        buyer={'id':1,'role':'buyer'}
        with server.connect() as con:
            first=chat.send(con,buyer,{'product_id':1,'body':'Hello'},10,server.create_notification)
            reply=chat.send(con,self.seller,{'product_id':1,'buyer_id':1,'body':'Reply'},11,server.create_notification)
            chat.block(con,buyer,{'message_id':reply,'blocked':True})
            self.assertTrue(chat.listing(con,buyer)[0]['blocked_by_me'])
            for user,data in [(buyer,{'product_id':1,'body':'Again'}),(self.seller,{'product_id':1,'buyer_id':1,'body':'Again'})]:
                with self.assertRaises(PermissionError):chat.send(con,user,data,12,server.create_notification)
            chat.block(con,self.seller,{'message_id':first,'blocked':False})
            self.assertTrue(chat.listing(con,buyer)[0]['blocked_by_me'])
            report=chat.report_data(con,buyer,{'message_id':reply,'reason':'Harassment','user_id':999})
            self.assertEqual(report['priority'],'high')
            self.assertIn('Reported account: 2',report['message'])
            with self.assertRaises(PermissionError):chat.report_data(con,{'id':999,'role':'buyer'},{'message_id':reply,'reason':'X'})
            with self.assertRaises(PermissionError):chat.block(con,buyer,{'message_id':first,'blocked':True})
            chat.block(con,buyer,{'message_id':reply,'blocked':False})
            chat.send(con,buyer,{'product_id':1,'body':'Unblocked'},13,server.create_notification)

    def test_ratings_use_reviews_not_product_defaults(self):
        with server.connect() as con:
            con.execute('DELETE FROM reviews')
            con.execute('UPDATE products SET rating=4.8')
        self.h.get_products({})
        product=self.reply.call_args.args[2]['products'][0]
        self.assertEqual(product['rating'],0)
        self.assertEqual(product['review_count'],0)

    def test_block_through_postgres_adapter_without_id_column(self):
        buyer = {'id': 1, 'role': 'buyer'}
        with server.connect() as con:
            chat.send(con, buyer, {'product_id': 1, 'body': 'Hello'}, 10, server.create_notification)
            reply = chat.send(con, self.seller, {'product_id': 1, 'buyer_id': 1, 'body': 'Reply'}, 11, server.create_notification)
            # Exercise the production SQL rewrite against the real composite-key
            # table. Only placeholder syntax is translated for the SQLite fixture.
            driver = Mock()
            driver.execute.side_effect = lambda sql, params: con.con.execute(sql.replace('%s', '?'), params)
            adapter = server.DbConnection(driver)
            with patch.object(server, 'USE_POSTGRES', True):
                chat.block(adapter, buyer, {'message_id': reply, 'blocked': True})
                chat.block(adapter, buyer, {'message_id': reply, 'blocked': True})
                self.assertEqual(con.con.execute('SELECT COUNT(*) FROM chat_blocks').fetchone()[0], 1)
                chat.block(adapter, buyer, {'message_id': reply, 'blocked': False})
            self.assertEqual(con.execute('SELECT COUNT(*) FROM chat_blocks').fetchone()[0], 0)
            inserts = [call.args[0] for call in driver.execute.call_args_list if call.args[0].startswith('INSERT')]
            self.assertTrue(all(sql.endswith('RETURNING blocker_id') for sql in inserts))


if __name__=='__main__':unittest.main()
