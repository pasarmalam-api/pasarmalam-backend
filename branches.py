"""Store branches share product identity and inventory, but may override prices."""
from decimal import Decimal, InvalidOperation
import json
import secrets
import time

from lalamove import waypoint


def migrate(con):
    con.execute('''CREATE TABLE IF NOT EXISTS shop_branches (
        id TEXT PRIMARY KEY, seller_id INTEGER NOT NULL, name TEXT NOT NULL,
        pickup TEXT NOT NULL, phone TEXT NOT NULL, is_open INTEGER NOT NULL DEFAULT 1,
        active INTEGER NOT NULL DEFAULT 1, revision INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL)''')
    con.execute('CREATE INDEX IF NOT EXISTS shop_branches_seller ON shop_branches(seller_id)')
    con.execute('''CREATE TABLE IF NOT EXISTS branch_prices (
        branch_id TEXT NOT NULL, product_id INTEGER NOT NULL, price TEXT NOT NULL,
        PRIMARY KEY (branch_id, product_id))''')


def owned(con, seller_id, ident, lock=False):
    row = con.execute('SELECT * FROM shop_branches WHERE id=? AND seller_id=?' +
                      (' FOR UPDATE' if lock else ''), (ident, seller_id)).fetchone()
    if not row:
        raise ValueError('Branch not found')
    return dict(row)


def listing(con, seller_id):
    rows = [dict(r) for r in con.execute('SELECT * FROM shop_branches WHERE seller_id=? ORDER BY name,id', (seller_id,))]
    for row in rows:
        row['pickup'] = json.loads(row['pickup'])
        row['is_open'], row['active'] = bool(row['is_open']), bool(row['active'])
        row['prices'] = {str(p['product_id']): float(p['price']) for p in con.execute(
            'SELECT product_id,price FROM branch_prices WHERE branch_id=?', (row['id'],))}
    return rows


def save(con, seller_id, data, lock=False):
    ident = str(data.get('id') or '')
    previous = owned(con, seller_id, ident, lock) if ident else None
    if previous and data.get('revision') != previous['revision']:
        raise ValueError('Branch changed elsewhere. Reload before saving.')
    name = str(data.get('name') or '').strip()
    phone = str(data.get('phone') or '').strip()
    if not name or len(name) > 100 or not phone or len(phone) > 40:
        raise ValueError('Branch name and contact phone are required (maximum 100 and 40 characters).')
    if type(data.get('is_open')) is not bool or type(data.get('active')) is not bool:
        raise ValueError('Branch availability must be true or false.')
    if data.get('confirmed') is not True:
        raise ValueError('Confirm the branch pickup location.')
    point = waypoint(data)
    if not (0 <= float(point['coordinates']['lat']) <= 8 and 99 <= float(point['coordinates']['lng']) <= 120):
        raise ValueError('Choose a Malaysian branch location.')
    prices = data.get('prices', {})
    if not isinstance(prices, dict):
        raise ValueError('Invalid branch prices')
    products = {str(r['id']) for r in con.execute('SELECT id FROM products WHERE seller_id=?', (seller_id,))}
    checked = {}
    for product_id, raw in prices.items():
        if str(product_id) not in products:
            raise ValueError('Branch prices must belong to your products.')
        if raw is None or raw == '':
            continue
        try:
            price = Decimal(str(raw))
            if not price.is_finite() or price < 0 or price > 1000000 or price != price.quantize(Decimal('.01')):
                raise ValueError()
        except (InvalidOperation, ValueError):
            raise ValueError('Prices must be valid RM amounts with at most two decimal places.') from None
        checked[int(product_id)] = str(price.quantize(Decimal('.01')))
    if not previous:
        count = con.execute('SELECT COUNT(*) AS n FROM shop_branches WHERE seller_id=?', (seller_id,)).fetchone()['n']
        if count >= 50:
            raise ValueError('Maximum 50 branches per seller.')
        ident = secrets.token_hex(16)
        con.execute('''INSERT INTO shop_branches(id,seller_id,name,pickup,phone,is_open,active,revision,updated_at)
            VALUES(?,?,?,?,?,?,?,1,?)''', (ident, seller_id, name, json.dumps(point), phone,
                                           int(data['is_open']), int(data['active']), int(time.time())))
    else:
        con.execute('''UPDATE shop_branches SET name=?,pickup=?,phone=?,is_open=?,active=?,
            revision=revision+1,updated_at=? WHERE id=? AND seller_id=?''',
                    (name, json.dumps(point), phone, int(data['is_open']), int(data['active']), int(time.time()), ident, seller_id))
    con.execute('DELETE FROM branch_prices WHERE branch_id=?', (ident,))
    for product_id, price in checked.items():
        con.execute('INSERT INTO branch_prices(branch_id,product_id,price) VALUES(?,?,?)', (ident, product_id, price))
    return ident


def resolve(con, product, ident='', lock=False):
    if not ident:
        return None
    row = owned(con, product['seller_id'], str(ident), lock)
    if not row['active'] or not row['is_open']:
        raise ValueError('This branch is closed or unavailable. Choose another branch.')
    price = con.execute('SELECT price FROM branch_prices WHERE branch_id=? AND product_id=?', (row['id'], product['id'])).fetchone()
    return {'id': row['id'], 'name': row['name'], 'pickup': json.loads(row['pickup']),
            'phone': row['phone'], 'revision': row['revision'],
            'price': float(price['price']) if price else float(product['price'])}


def offers(con, product):
    seller = con.execute('SELECT shop_open,shop_name,address,status,seller_status FROM users WHERE id=?', (product['seller_id'],)).fetchone()
    if not seller or seller['status'] != 'active' or seller['seller_status'] != 'approved':
        return []
    pickup = con.execute('SELECT payload FROM delivery_pickups WHERE id=?', (product['seller_id'],)).fetchone()
    main = json.loads(pickup['payload']) if pickup else None
    result = [{'id': '', 'name': 'Main store', 'address': main['address'] if main else seller['address'],
               'coordinates': main['coordinates'] if main else None, 'price': float(product['price']),
               'is_open': bool(seller['shop_open']), 'delivery_available': bool(main)}]
    for row in listing(con, product['seller_id']):
        if row['active']:
            result.append({'id': row['id'], 'name': row['name'], 'address': row['pickup']['address'],
                           'coordinates': row['pickup']['coordinates'],
                           'price': row['prices'].get(str(product['id']), float(product['price'])),
                           'is_open': bool(seller['shop_open']) and row['is_open'], 'delivery_available': True})
    return result
