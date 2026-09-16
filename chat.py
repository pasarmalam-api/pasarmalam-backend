"""Account-scoped product conversations. Legacy name-only messages stay quarantined."""
def migrate(con, columns):
    for name, kind in {'buyer_id': 'INTEGER DEFAULT 0', 'read_at': 'INTEGER DEFAULT 0'}.items():
        if name not in columns:
            con.execute(f'ALTER TABLE messages ADD COLUMN {name} {kind}')
    con.execute('CREATE INDEX IF NOT EXISTS messages_thread ON messages(buyer_id, product_id, id)')


def scope(user):
    if user['role'] == 'buyer':
        return 'm.buyer_id=?', [user['id']]
    if user['role'] == 'seller':
        return 'p.seller_id=? AND m.buyer_id>0', [user['id']]
    raise PermissionError('Buyer or seller account required')


def listing(con, user):
    where, args = scope(user)
    return [dict(r) for r in con.execute(
        'SELECT m.*, p.name AS product_name FROM messages m JOIN products p ON p.id=m.product_id '
        'WHERE '+where+' ORDER BY m.id', args)]


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
