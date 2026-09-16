import unittest
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


if __name__=='__main__':unittest.main()
