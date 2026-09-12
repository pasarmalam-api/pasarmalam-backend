"""Persisted pickup locations and single-use, server-priced delivery quotations."""
from datetime import datetime
from decimal import Decimal
import json
import math
import secrets
import time

from lalamove import Client, waypoint


METHODS = {
    'Ambil Sendiri': 'pickup', 'In-Store Pickup': 'pickup',
    'Lalamove Biasa': 'standard', 'Lalamove Regular': 'standard', 'Standard Rider': 'standard',
    'Lalamove Segera': 'express', 'Lalamove Instant': 'express', 'Express Rider': 'express',
}
ADMIN_FEE = Decimal('0.40')


def migrate(con):
    con.execute('''CREATE TABLE IF NOT EXISTS delivery_pickups (
        id INTEGER PRIMARY KEY, payload TEXT NOT NULL, updated_at INTEGER NOT NULL)''')
    con.execute('''CREATE TABLE IF NOT EXISTS delivery_quotes (
        id TEXT PRIMARY KEY, buyer_id INTEGER NOT NULL, context TEXT NOT NULL,
        quotation TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0)''')


def pickup(con, seller_id):
    row = con.execute('SELECT payload FROM delivery_pickups WHERE id=?', (seller_id,)).fetchone()
    return json.loads(row['payload']) if row else None


def save_pickup(con, seller_id, data):
    if data.get('confirmed') is not True:
        raise ValueError('Confirm the coordinates match your pickup address.')
    point = waypoint(data)
    con.execute('''INSERT INTO delivery_pickups (id,payload,updated_at) VALUES (?,?,?)
        ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at''',
        (seller_id, json.dumps(point, sort_keys=True), int(time.time())))
    return point


def context(con, user, product, qty, data):
    method = METHODS.get(data.get('logistics_method'))
    if method not in ('express', 'standard'):
        raise ValueError('Select immediate or scheduled Lalamove delivery.')
    seller = con.execute('SELECT status,seller_status FROM users WHERE id=?', (product['seller_id'],)).fetchone()
    if not seller or seller['status'] != 'active' or seller['seller_status'] != 'approved':
        raise ValueError('This seller is not available for delivery.')
    origin = pickup(con, product['seller_id'])
    if not origin:
        raise ValueError('The seller must confirm their pickup location before Lalamove delivery is available.')
    if data.get('location_confirmed') is not True:
        raise ValueError('Confirm the delivery coordinates match your address.')
    destination = waypoint({'address': data.get('address'), 'coordinates': data.get('coordinates')})
    if data.get('package_confirmed') is not True:
        raise ValueError('Confirm the package fits the selected vehicle limits.')
    return {'buyer_id': user['id'], 'product_id': product['id'], 'seller_id': product['seller_id'],
            'quantity': qty, 'variant': str(data.get('variant') or ''), 'price': str(product['price']),
            'weight_kg': str(product['weight_kg']), 'pickup': origin, 'dropoff': destination,
            'mode': method, 'city': str(data.get('city') or ''),
            'service_type': str(data.get('service_type') or ''),
            'schedule_at': str(data.get('schedule_at') or '')}


def create_quote(con, user, product, qty, data, client=None):
    if data.get('fee_version') != 1:
        raise ValueError('Please refresh checkout to view the delivery fee breakdown.')
    ctx = context(con, user, product, qty, data)
    client = client or Client()
    cities = client.cities()
    city = next((c for c in cities if c['locode'] == ctx['city']), None)
    service = next((s for s in (city or {}).get('services', []) if s['key'] == ctx['service_type']), None)
    if not service:
        raise ValueError('Select an available city and vehicle.')
    load = service.get('load', {})
    try:
        limit = float(load.get('value'))
        weight = float(product['weight_kg']) * qty
    except (TypeError, ValueError):
        raise ValueError('Package or vehicle weight information is missing.') from None
    if load.get('unit') != 'kg' or not math.isfinite(limit) or not math.isfinite(weight) or weight <= 0 or weight > limit:
        raise ValueError('The package weight exceeds this vehicle capacity or cannot be verified.')
    quote = client.quote(ctx)
    courier = Decimal(str(quote['priceBreakdown']['total'])).quantize(Decimal('0.01'))
    charges = {'courier_fee': float(courier), 'admin_fee': float(ADMIN_FEE),
               'total': float(courier + ADMIN_FEE), 'version': 1}
    # Store platform pricing separately from the unmodified provider quotation.
    stored_quote = {**quote, '_pasarmalam_charges': charges}
    ident = secrets.token_urlsafe(32)
    expires = int(datetime.fromisoformat(quote['expiresAt'].replace('Z', '+00:00')).timestamp())
    con.execute('DELETE FROM delivery_quotes WHERE used=0 AND expires_at<?', (int(time.time()) - 86400,))
    con.execute('INSERT INTO delivery_quotes(id,buyer_id,context,quotation,expires_at,used) VALUES(?,?,?,?,?,0)',
                (ident, user['id'], json.dumps(ctx, sort_keys=True), json.dumps(stored_quote), expires))
    return {'quote_id': ident, 'fee': charges['total'], 'courier_fee': charges['courier_fee'],
            'admin_fee': charges['admin_fee'], 'fee_version': 1, 'currency': 'MYR',
            'expires_at': expires, 'mode': ctx['mode']}


def consume(con, user, product, qty, data):
    method = METHODS.get(data.get('logistics_method'))
    if method == 'pickup':
        return 0.0, None
    ctx = context(con, user, product, qty, data)
    row = con.execute('SELECT * FROM delivery_quotes WHERE id=? AND buyer_id=?',
                      (str(data.get('quote_id') or ''), user['id'])).fetchone()
    if not row or row['used'] or row['expires_at'] <= time.time():
        raise ValueError('Your delivery quote has expired or was used. Request a new quote.')
    if json.loads(row['context']) != ctx:
        raise ValueError('Delivery details changed. Request a new quote.')
    quote = json.loads(row['quotation'])
    charges = quote.pop('_pasarmalam_charges', None)
    # Quotes issued before this release retain their original price and no admin fee.
    if charges is None:
        charges = {'courier_fee': float(quote['priceBreakdown']['total']), 'admin_fee': 0,
                   'total': float(quote['priceBreakdown']['total']), 'version': 0}
    if charges['version'] == 1 and data.get('fee_version') != 1:
        raise ValueError('Please refresh checkout to view the delivery fee breakdown.')
    claimed = con.execute('UPDATE delivery_quotes SET used=1 WHERE id=? AND used=0 RETURNING id', (row['id'],)).fetchone()
    if not claimed:
        raise ValueError('This delivery quote was already used.')
    seller = con.execute('SELECT name,phone FROM users WHERE id=?', (product['seller_id'],)).fetchone()
    return charges['total'], {'context': ctx, 'quotation': quote, 'charges': charges,
                                                  'pickup_contact': dict(seller),
                                                  'recipient': {'name': user['name'], 'phone': str(data.get('buyer_phone') or user.get('phone') or '')},
                                                  'dispatch_status': 'manual_booking_required'}
