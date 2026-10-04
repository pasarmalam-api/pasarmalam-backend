"""Verified deletion requests, with explicit manual fulfilment records."""
import json
import re


def migrate(con, postgres):
    pk = 'SERIAL PRIMARY KEY' if postgres else 'INTEGER PRIMARY KEY AUTOINCREMENT'
    con.execute(f"""CREATE TABLE IF NOT EXISTS account_deletion_requests (
        id {pk}, user_id INTEGER NOT NULL UNIQUE, role TEXT NOT NULL,
        email TEXT NOT NULL, requested_at BIGINT NOT NULL, due_at BIGINT NOT NULL,
        status TEXT NOT NULL DEFAULT 'requested', completed_at BIGINT DEFAULT 0,
        admin_id INTEGER DEFAULT 0, fulfilment_note TEXT DEFAULT '')""")
    con.execute(f"""CREATE TABLE IF NOT EXISTS deletion_cleanup (
        id {pk}, request_id INTEGER NOT NULL UNIQUE, inventory TEXT NOT NULL,
        purged_at BIGINT NOT NULL, retention_until BIGINT NOT NULL DEFAULT 0,
        retention_reason TEXT DEFAULT '', retained_identity TEXT DEFAULT '{{}}')""")
    con.execute('CREATE TABLE IF NOT EXISTS redacted_orders (id INTEGER PRIMARY KEY, redacted_at BIGINT NOT NULL)')


def inspect(con, user_id):
    account = con.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
    if not account:
        raise ValueError('Account not found')
    products = [dict(r) for r in con.execute('SELECT * FROM products WHERE seller_id=?', (user_id,))]
    orders = [dict(r) for r in con.execute('SELECT * FROM orders WHERE buyer_id=? OR product_id IN (SELECT id FROM products WHERE seller_id=?)', (user_id, user_id))]
    returns = [dict(r) for r in con.execute('SELECT * FROM returns WHERE buyer_id=? OR order_id IN (SELECT id FROM orders WHERE product_id IN (SELECT id FROM products WHERE seller_id=?))', (user_id, user_id))]
    wallet = [dict(r) for r in con.execute('SELECT * FROM wallet WHERE seller_id=?', (user_id,))]
    blockers = []
    for order in orders:
        if order['order_status'] not in ('completed', 'cancelled') or order['payment_status'] in ('pending', 'pending_review'):
            blockers.append(f"Resolve order PM-{order['id']} before erasure")
        if order['order_status'] == 'completed' and order['escrow_status'] not in ('released', 'refunded'):
            blockers.append(f"Resolve escrow for PM-{order['id']}")
        if order['order_status'] == 'cancelled' and order['payment_status'] == 'paid' and order['escrow_status'] != 'refunded':
            blockers.append(f"Resolve the paid cancellation/refund for PM-{order['id']}")
    for item in returns:
        if item['dispute_status'] not in ('closed', 'resolved', 'rejected'):
            blockers.append(f"Resolve return #{item['id']}")
    for item in wallet:
        if item['status'] not in ('paid', 'cancelled', 'rejected'):
            blockers.append(f"Resolve wallet entry #{item['id']}")
    for order in orders:
        for payment in con.execute('SELECT id,status FROM payments WHERE order_id=?', (order['id'],)):
            if payment['status'] not in ('paid', 'cancelled', 'failed', 'rejected', 'expired', 'refunded'):
                blockers.append(f"Resolve gateway payment #{payment['id']}")
    legacy_reviews = [dict(r) for r in con.execute('SELECT id,product_id,buyer_name,title,body FROM reviews WHERE buyer_id=0 AND buyer_name=?', (account['name'],))]
    legacy_messages = [dict(r) for r in con.execute('SELECT id,product_id,buyer_name,body FROM messages WHERE buyer_id=0 AND buyer_name=?', (account['name'],))]
    return {'account': dict(account), 'products': products, 'orders': orders,
            'returns': returns, 'wallet': wallet, 'blockers': blockers,
            'legacy_reviews': legacy_reviews, 'legacy_messages': legacy_messages}


def preview(con, user_id):
    info = inspect(con, user_id)
    return {'user_id': user_id, 'email': info['account']['email'],
            'counts': {k: len(info[k]) for k in ('products', 'orders', 'returns', 'wallet')},
            'blockers': info['blockers'], 'legacy_reviews': info['legacy_reviews'],
            'legacy_messages': info['legacy_messages']}


def purge(con, admin, data, timestamp, postgres=False):
    # Lock the complete local scope before checking balances and changing any data.
    tables = 'users, products, orders, payments, returns, wallet, campaigns, reviews, messages, cart_items, wishlist, notifications, support_tickets, seller_email_queue, email_otps, shop_branches, branch_prices, delivery_pickups, delivery_quotes, audit_logs, account_deletion_requests, deletion_cleanup, redacted_orders'
    if postgres:
        con.execute('LOCK TABLE ' + tables + ' IN SHARE ROW EXCLUSIVE MODE')
    else:
        con.execute('BEGIN IMMEDIATE')
    row = con.execute('SELECT * FROM account_deletion_requests WHERE id=?', (int(data.get('id') or 0),)).fetchone()
    if not row or row['status'] not in ('requested', 'reviewing'):
        raise ValueError('An unfulfilled deletion request is required')
    uid = row['user_id']
    info = inspect(con, uid)
    account = info['account']
    if account['role'] == 'admin' or uid == admin['id']:
        raise ValueError('Administrator accounts cannot be erased here')
    if data.get('confirm_email') != account['email'] or data.get('confirm_purge') is not True:
        raise ValueError('Type the account email and explicitly confirm permanent erasure')
    if info['blockers']:
        raise ValueError('; '.join(info['blockers']))
    if data.get('legacy_reviewed') is not True:
        raise ValueError('Review legacy records before erasure; matching names do not prove ownership')
    selected = {}
    for kind in ('legacy_reviews', 'legacy_messages'):
        selected[kind] = set(int(x) for x in data.get(kind, []))
        if not selected[kind].issubset({r['id'] for r in info[kind]}):
            raise ValueError('A selected legacy record is outside this review scope')
    reason = str(data.get('retention_reason') or '').strip()
    until = int(data.get('retention_until') or 0)
    fields = data.get('retained_fields', [])
    if not isinstance(fields, list) or any(k not in ('name', 'address', 'ssm_number') for k in fields):
        raise ValueError('Only specifically needed invoice identity fields can be retained')
    if info['orders'] or info['wallet'] or fields:
        if len(reason) < 15 or len(reason) > 1000 or not timestamp < until <= timestamp + 10 * 366 * 86400:
            raise ValueError('Document the financial-record retention reason and a future expiry (maximum ten years)')
    else:
        until, reason = 0, ''
    # Save only cleanup references; never a copy of the full profile or credentials.
    urls = set()
    def collect(value):
        if isinstance(value, dict):
            for k, v in value.items():
                if k != 'password': collect(v)
        elif isinstance(value, (list, tuple)):
            for v in value: collect(v)
        elif isinstance(value, str):
            urls.update(re.findall(r'https?://[^\s"<>\\]+', value))
    collect(account)
    for item in info['products'] + info['returns'] + info['wallet']:
        collect(item)
    for order in info['orders']:
        collect({k: order[k] for k in ('payment_proof_url', 'awb_label', 'delivery_data')})
    for item in con.execute('SELECT message FROM support_tickets WHERE user_id=?', (uid,)):
        collect(item['message'])
    for item in con.execute('SELECT body FROM messages WHERE buyer_id=? OR product_id IN (SELECT id FROM products WHERE seller_id=?)', (uid, uid)):
        collect(item['body'])
    inventory = {'urls_to_review': sorted(urls), 'provider_checks': ['Cloudinary uploads, including unlinked photos; check shared files before removing', 'AI requests and provider retention', 'Payment/courier records: request deletion where not legally retained', 'Transactional email copies', 'Hosting logs and backups; prevent restoration of erased data', 'Legacy notification/audit free text without reliable account ownership links'], 'legacy_reviewed': True}
    con.execute('INSERT INTO deletion_cleanup (request_id,inventory,purged_at,retention_until,retention_reason,retained_identity) VALUES (?,?,?,?,?,?)',
                (row['id'], json.dumps(inventory), timestamp, until, reason,
                 json.dumps({'identity': {k: account[k] for k in fields},
                             'invoice_items': [{'product_id': p['id'], 'name': p['name']}
                                               for p in info['products'] if any(o['product_id'] == p['id'] for o in info['orders'])]})))
    for rid in selected['legacy_reviews']:
        con.execute('DELETE FROM reviews WHERE id=? AND buyer_id=0', (rid,))
    for mid in selected['legacy_messages']:
        con.execute('DELETE FROM messages WHERE id=? AND buyer_id=0', (mid,))
    for table in ('messages', 'reviews'):
        con.execute(f'DELETE FROM {table} WHERE buyer_id=? OR product_id IN (SELECT id FROM products WHERE seller_id=?)', (uid, uid))
    con.execute('DELETE FROM reviews WHERE seller_id=?', (uid,))
    con.execute('DELETE FROM chat_blocks WHERE blocker_id=? OR blocked_id=?', (uid, uid))
    for table in ('cart_items', 'wishlist'):
        con.execute(f'DELETE FROM {table} WHERE buyer_id=? OR product_id IN (SELECT id FROM products WHERE seller_id=?)', (uid, uid))
    for table in ('notifications', 'support_tickets', 'seller_email_queue'):
        con.execute(f'DELETE FROM {table} WHERE user_id=?', (uid,))
    con.execute('DELETE FROM email_otps WHERE LOWER(email)=?', (account['email'].lower(),))
    con.execute('DELETE FROM campaigns WHERE seller_id=?', (uid,))
    con.execute('DELETE FROM branch_prices WHERE branch_id IN (SELECT id FROM shop_branches WHERE seller_id=?)', (uid,))
    con.execute('DELETE FROM shop_branches WHERE seller_id=?', (uid,))
    con.execute('DELETE FROM delivery_pickups WHERE id=?', (uid,))
    for quote in con.execute('SELECT id,buyer_id,context FROM delivery_quotes').fetchall():
        try:
            seller_id = json.loads(quote['context']).get('seller_id')
        except (TypeError, ValueError):
            seller_id = None
        if quote['buyer_id'] == uid or seller_id == uid:
            con.execute('DELETE FROM delivery_quotes WHERE id=?', (quote['id'],))
    # Preserve amounts/reference IDs for reconciliation, not raw gateway payloads.
    for order in info['orders']:
        oid = order['id']
        con.execute('INSERT INTO redacted_orders (id,redacted_at) VALUES (?,?) ON CONFLICT(id) DO NOTHING RETURNING id', (oid, timestamp)).fetchone()
        con.execute("UPDATE orders SET payment_url='',payment_proof_url='',payment_review_note='',tracking_no='',awb_label='',delivery_data='' WHERE id=?", (oid,))
        con.execute("UPDATE payments SET checkout_url='',raw_response='' WHERE order_id=?", (oid,))
        if order['buyer_id'] == uid:
            con.execute("UPDATE orders SET buyer_id=0,buyer_name='Deleted account',address='',variant='' WHERE id=?", (oid,))
        con.execute("UPDATE returns SET reason='',evidence_url='',seller_response='' WHERE order_id=?", (oid,))
    con.execute("UPDATE returns SET buyer_id=0,buyer_name='Deleted account' WHERE buyer_id=?", (uid,))
    con.execute("UPDATE wallet SET note='',payout_proof_url='' WHERE seller_id=?", (uid,))
    con.execute("DELETE FROM products WHERE seller_id=? AND id NOT IN (SELECT product_id FROM orders)", (uid,))
    con.execute("UPDATE products SET name='Removed listing',shop='Closed shop',description='',warranty='',variants='[]',images='[]',image_url='',stock=0,moderation_status='removed' WHERE seller_id=?", (uid,))
    con.execute("UPDATE audit_logs SET note='' WHERE actor_id=? OR (target_type='user' AND target_id=?)", (uid, uid))
    con.execute('DELETE FROM users WHERE id=?', (uid,))
    con.execute("UPDATE account_deletion_requests SET status='external_cleanup',admin_id=?,fulfilment_note='Local account data erased. External cleanup and confirmation pending.' WHERE id=?", (admin['id'], row['id']))
    con.execute('INSERT INTO audit_logs (actor_id,action,target_type,target_id,note,created_at) VALUES (?,?,?,?,?,?)',
                (admin['id'], 'account_data_erased', 'deletion_request', row['id'], 'Local purge committed; external tasks pending', timestamp))


def expire_identity(con, timestamp):
    con.execute("UPDATE deletion_cleanup SET retained_identity='{}' WHERE retention_until>0 AND retention_until<=?", (timestamp,))


def submit(con, user, timestamp):
    # A unique account key makes retries and simultaneous submissions idempotent.
    con.execute("""INSERT INTO account_deletion_requests
        (user_id,role,email,requested_at,due_at) VALUES (?,?,?,?,?)
        ON CONFLICT(user_id) DO NOTHING RETURNING id""",
        (user['id'], user['role'], user['email'], timestamp, timestamp + 30 * 86400)).fetchone()
    return dict(con.execute('SELECT * FROM account_deletion_requests WHERE user_id=?', (user['id'],)).fetchone())


def public(row):
    return {k: row[k] for k in ('id', 'requested_at', 'due_at', 'status', 'completed_at')}


def update(con, admin, data, timestamp):
    request_id = int(data.get('id') or 0)
    row = con.execute('SELECT * FROM account_deletion_requests WHERE id=?', (request_id,)).fetchone()
    if not row:
        raise ValueError('Deletion request not found')
    status = data.get('status')
    if status not in ('reviewing', 'completed'):
        raise ValueError('Choose reviewing or completed')
    if row['status'] == 'completed':
        raise ValueError('This deletion request is already completed')
    if row['status'] == 'external_cleanup' and status == 'reviewing':
        status = 'external_cleanup'
    note = str(data.get('note') or '').strip()
    if not 10 <= len(note) <= 2000:
        raise ValueError('Enter a fulfilment note (10 to 2000 characters), without passwords or private documents')
    if status == 'completed':
        if con.execute('SELECT id FROM users WHERE id=?', (row['user_id'],)).fetchone():
            raise ValueError('Account still exists. Remove the account and associated data before recording completion; suspension is not deletion.')
        for key in ('data_reviewed', 'retention_reviewed', 'confirmation_sent'):
            if data.get(key) is not True:
                raise ValueError('Confirm associated-data removal, retained-record review and completion email before completing')
        con.execute("UPDATE deletion_cleanup SET inventory='{}' WHERE request_id=?", (request_id,))
    con.execute('UPDATE account_deletion_requests SET status=?, completed_at=?, admin_id=?, fulfilment_note=?, email=? WHERE id=?',
                (status, timestamp if status == 'completed' else 0, admin['id'], note,
                 '' if status == 'completed' else row['email'], request_id))
    con.execute('INSERT INTO audit_logs (actor_id,action,target_type,target_id,note,created_at) VALUES (?,?,?,?,?,?)',
                (admin['id'], 'account_deletion_' + status, 'deletion_request', request_id,
                 'Manual fulfilment record updated', timestamp))
