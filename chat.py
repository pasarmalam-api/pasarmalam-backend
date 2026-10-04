"""Account-scoped product conversations. Legacy name-only messages stay quarantined."""
def migrate(con, columns):
    for name, kind in {'buyer_id': 'INTEGER DEFAULT 0', 'read_at': 'INTEGER DEFAULT 0'}.items():
        if name not in columns:
            con.execute(f'ALTER TABLE messages ADD COLUMN {name} {kind}')
    con.execute('CREATE INDEX IF NOT EXISTS messages_thread ON messages(buyer_id, product_id, id)')
    con.execute('CREATE TABLE IF NOT EXISTS chat_blocks (blocker_id INTEGER NOT NULL, blocked_id INTEGER NOT NULL, PRIMARY KEY (blocker_id, blocked_id))')


def safety_target(con, user, data):
    where, args = scope(user)
    row = con.execute('SELECT m.*, p.seller_id FROM messages m JOIN products p ON p.id=m.product_id WHERE '
                      + where + ' AND m.id=?', args + [int(data.get('message_id') or 0)]).fetchone()
    if not row or row['sender_role'] == user['role']:
        raise PermissionError('Choose a received message in your conversation.')
    return row, row['seller_id'] if user['role'] == 'buyer' else row['buyer_id']


def block(con, user, data):
    _, other = safety_target(con, user, data)
    if data.get('blocked') is True:
        con.execute('INSERT INTO chat_blocks (blocker_id,blocked_id) VALUES (?,?) ON CONFLICT DO NOTHING', (user['id'], other))
    elif data.get('blocked') is False:
        con.execute('DELETE FROM chat_blocks WHERE blocker_id=? AND blocked_id=?', (user['id'], other))
    else:
        raise ValueError('Choose block or unblock.')


def report_data(con, user, data):
    row, other = safety_target(con, user, data)
    reason = str(data.get('reason', '')).strip()
    if not reason or len(reason) > 1000:
        raise ValueError('Enter a report reason between 1 and 1000 characters.')
    return {'category': 'Chat safety', 'priority': 'high', 'subject': 'Chat report: message #' + str(row['id']),
            'message': f"Reported account: {other}; product: {row['product_id']}; message: {row['id']}\nReason: {reason}\nMessage: {row['body']}"}


def scope(user):
    if user['role'] == 'buyer':
        return 'm.buyer_id=?', [user['id']]
    if user['role'] == 'seller':
        return 'p.seller_id=? AND m.buyer_id>0', [user['id']]
    raise PermissionError('Buyer or seller account required')


def listing(con, user):
    where, args = scope(user)
    return [dict(r) for r in con.execute(
        'SELECT m.*, p.name AS product_name, EXISTS(SELECT 1 FROM chat_blocks b WHERE b.blocker_id=? AND '
        'b.blocked_id=CASE WHEN m.buyer_id=? THEN p.seller_id ELSE m.buyer_id END) AS blocked_by_me '
        'FROM messages m JOIN products p ON p.id=m.product_id '
        'WHERE '+where+' ORDER BY m.id', [user['id'], user['id']] + args)]


def target(role, product_id, buyer_id, message_id):
    page = 'chat.html' if role == 'buyer' else 'messages.html'
    return f'{page}?product_id={product_id}&buyer_id={buyer_id}&message_id={message_id}'


def send(con, user, data, now, notify):
    scope(user)
    body = str(data.get('body', '')).strip()
    if not body or len(body) > 4000:
        raise ValueError('Enter a message between 1 and 4000 characters.')
    product_id = int(data.get('product_id') or 0)
    product = con.execute('SELECT * FROM products WHERE id=?', (product_id,)).fetchone()
    if not product:
        raise ValueError('Product conversation is unavailable.')
    if user['role'] == 'seller' and product['seller_id'] != user['id']:
        raise PermissionError('Cannot reply to another shop conversation')
    buyer_id = user['id'] if user['role'] == 'buyer' else int(data.get('buyer_id') or 0)
    buyer = con.execute('SELECT name FROM users WHERE id=?', (buyer_id,)).fetchone()
    if not buyer:
        raise ValueError('Choose a buyer conversation.')
    if buyer_id == product['seller_id']:
        raise ValueError('You cannot message your own shop.')
    if con.execute('SELECT 1 FROM chat_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)',
                   (buyer_id, product['seller_id'], product['seller_id'], buyer_id)).fetchone():
        raise PermissionError('Messaging is blocked between these accounts.')
    if user['role'] == 'seller' and not con.execute(
            'SELECT id FROM messages WHERE product_id=? AND buyer_id=? LIMIT 1', (product_id,buyer_id)).fetchone() and not con.execute(
            'SELECT id FROM orders WHERE product_id=? AND buyer_id=? LIMIT 1', (product_id,buyer_id)).fetchone():
        raise ValueError('Buyer conversation not found')
    cur=con.execute('INSERT INTO messages (product_id,buyer_id,buyer_name,seller_name,sender_role,body,created_at) VALUES (?,?,?,?,?,?,?)',
        (product_id,buyer_id,buyer['name'],(user.get('shop_name') or product['shop']) if user['role']=='seller' else product['shop'],user['role'],body,now))
    role='seller' if user['role']=='buyer' else 'buyer'
    recipient=product['seller_id'] if role=='seller' else buyer_id
    notify(con,role,recipient,'New message about '+product['name'],body,'message',target(role,product_id,buyer_id,cur.lastrowid))
    return cur.lastrowid


def read(con,user,data,now):
    where,args=scope(user)
    product_id=int(data.get('product_id') or 0)
    buyer_id=user['id'] if user['role']=='buyer' else int(data.get('buyer_id') or 0)
    through=int(data.get('through_id') or 0)
    rows=con.execute('SELECT m.id FROM messages m JOIN products p ON p.id=m.product_id WHERE '+where+
        ' AND m.product_id=? AND m.buyer_id=? AND m.id<=? AND m.sender_role<>? AND m.read_at=0',
        args+[product_id,buyer_id,through,user['role']]).fetchall()
    for row in rows:
        con.execute('UPDATE messages SET read_at=? WHERE id=?',(now,row['id']))
        con.execute('UPDATE notifications SET read_at=? WHERE role=? AND user_id=? AND target_url=?',
            (now,user['role'],user['id'],target(user['role'],product_id,buyer_id,row['id'])))
