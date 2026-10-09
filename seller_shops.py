"""Independent store profiles share one owner login, not stock or orders.

Existing seller IDs remain store IDs so historical product/order references do
not change. Additional profiles cannot log in independently.
"""
import secrets
import time

LIMIT = 5


def account_id(user):
    return int(user.get('shop_owner_id') or user['id'])


def listing(con, owner_id):
    return [dict(row) for row in con.execute(
        "SELECT id,shop_name,shop_category,status,seller_status FROM users "
        "WHERE (id=? OR shop_owner_id=?) AND role='seller' ORDER BY id",
        (owner_id, owner_id))]


def select(con, owner_id, shop_id):
    row = con.execute("SELECT * FROM users WHERE id=? AND (id=? OR shop_owner_id=?) AND role='seller'",
                      (shop_id, owner_id, owner_id)).fetchone()
    if not row:
        raise PermissionError('Shop does not belong to this account')
    if row['status'] != 'active' or row['seller_status'] != 'approved':
        raise PermissionError('This shop is not available')
    return dict(row)


def create(con, owner_id, data, categories, postgres=False):
    # Lock the owner before counting: concurrent creates cannot exceed five.
    if not postgres:
        con.execute('BEGIN IMMEDIATE')
    row = con.execute('SELECT * FROM users WHERE id=?' + (' FOR UPDATE' if postgres else ''), (owner_id,)).fetchone()
    if not row or row['role'] != 'seller' or row['status'] != 'active' or row['seller_status'] != 'approved' or row['shop_owner_id']:
        raise PermissionError('An approved seller account is required')
    owner = dict(row)
    name = str(data.get('shop_name') or '').strip()
    category = data.get('shop_category')
    if not 2 <= len(name) <= 100:
        raise ValueError('Shop name must contain 2 to 100 characters')
    if category not in categories:
        raise ValueError('Choose a valid shop category')
    shops = listing(con, owner_id)
    if any(s['shop_name'].strip().casefold() == name.casefold() for s in shops):
        raise ValueError('You already have a shop with this name')
    if len(shops) >= LIMIT:
        raise ValueError('Maximum five shops per seller account, including your first shop')
    # Copy owner verification/payout details, but never inventory or pickup data.
    fields = ('name', 'phone', 'identity_type', 'identity_number', 'business_type',
              'ssm_number', 'ssm_document_url', 'business_verification_status',
              'business_verification_submitted_at', 'bank_name', 'bank_account_name', 'bank_account_number')
    values = {key: owner[key] for key in fields}
    values.update(role='seller', email='shop-'+secrets.token_hex(16)+'@shops.invalid',
                  password='', shop_owner_id=owner_id, shop_name=name, shop_category=category,
                  status='active', seller_status='approved', created_at=int(time.time()))
    columns = ','.join(values)
    placeholders = ','.join('?' for _ in values)
    ident = con.execute(f'INSERT INTO users ({columns}) VALUES ({placeholders}) RETURNING id', tuple(values.values())).fetchone()['id']
    return select(con, owner_id, ident)
