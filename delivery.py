"""Persisted pickup locations and single-use, server-priced delivery quotations."""
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
import json
import math
import secrets
import time

from lalamove import Client, LalamoveError, waypoint
import branches


METHODS = {
    'EasyParcel': 'easyparcel',
    'PM Express': 'pm_express',
    'PM Pooling': 'pm_pooling',
    'Ambil Sendiri': 'pickup', 'In-Store Pickup': 'pickup',
    'Lalamove Biasa': 'standard', 'Lalamove Regular': 'standard', 'Standard Rider': 'standard',
    'Lalamove Segera': 'express', 'Lalamove Instant': 'express', 'Express Rider': 'express',
}
ADMIN_FEE = Decimal('0.40')
PM_RIDER_METHODS = ('pm_express', 'pm_pooling')
# Food eligibility needs explicit storage information; legacy listings fail closed.
POOLING_CATEGORIES = frozenset(('phones', 'chargers', 'electronics', 'car parts',
                               'hardware', 'stationery', 'toys', 'shoes', 'clothes', 'cosmetics'))


def pooling_eligible(product):
    product = dict(product)
    category = str(product.get('category') or '').strip().casefold()
    storage = product.get('storage_class', 'unknown')
    if storage == 'perishable':
        return False
    return (category in POOLING_CATEGORIES
            or category == 'groceries' and storage in ('shelf_stable', 'canned_drink')
            or category == 'drinks' and storage == 'canned_drink')


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
    for key in ('city', 'service_type'):
        value = str(data.get(key) or '').strip()
        if len(value) > 100:
            raise ValueError('Invalid seller delivery setting.')
        if value:
            point[key] = value
    con.execute('''INSERT INTO delivery_pickups (id,payload,updated_at) VALUES (?,?,?)
        ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at''',
        (seller_id, json.dumps(point, sort_keys=True), int(time.time())))
    return point


def context(con, user, product, qty, data):
    method = METHODS.get(data.get('logistics_method'))
    if method == 'easyparcel':
        from parcel_delivery import context as parcel_context
        return parcel_context(con, user, product, qty, data)
    if method == 'pm_pooling' and not pooling_eligible(product):
        raise ValueError('PM Pooling is unavailable for this item. Fresh, hot, chilled, frozen and other perishable items are excluded; groceries and canned drinks need confirmed shelf-stable storage.')
    if method not in ('express', 'standard', *PM_RIDER_METHODS):
        raise ValueError('Select immediate or scheduled Lalamove delivery.')
    seller = con.execute('SELECT status,seller_status FROM users WHERE id=?', (product['seller_id'],)).fetchone()
    if not seller or seller['status'] != 'active' or seller['seller_status'] != 'approved':
        raise ValueError('This seller is not available for delivery.')
    branch = branches.resolve(con, product, data.get('branch_id'))
    origin = branch['pickup'] if branch else pickup(con, product['seller_id'])
    if not origin:
        raise ValueError('The seller must confirm their pickup location before Lalamove delivery is available.')
    if data.get('simple_checkout') is True:
        settings = pickup(con, product['seller_id']) or {}
        if not settings.get('city'):
            raise ValueError('Local delivery is not set up by this seller yet. Choose another delivery option.')
        selected = data.get('service_type') if data.get('service_options') is True and method not in PM_RIDER_METHODS else None
        data = {**data, 'city': settings['city'], 'service_type': selected or 'AUTO', 'package_confirmed': True}
    if data.get('location_confirmed') is not True:
        raise ValueError('Confirm the delivery coordinates match your address.')
    destination = waypoint({'address': data.get('address'), 'coordinates': data.get('coordinates')})
    if data.get('package_confirmed') is not True:
        raise ValueError('Confirm the package fits the selected vehicle limits.')
    return {**({'branch': branch} if branch else {}), 'buyer_id': user['id'], 'product_id': product['id'], 'seller_id': product['seller_id'],
            'quantity': qty, 'variant': str(data.get('variant') or ''), 'price': str(product['price']),
            'weight_kg': str(product['weight_kg']), 'package_type': dict(product).get('shipping_type', ''),
            'automatic_vehicle': data.get('service_type') == 'AUTO', 'pickup': origin, 'dropoff': destination,
            'mode': method, 'city': str(data.get('city') or ''),
            'service_type': str(data.get('service_type') or ''),
            'schedule_at': str(data.get('schedule_at') or '')}


def suitable_service(service, product, qty):
    load = service.get('load', {})
    try:
        weight, limit = float(product['weight_kg']) * qty, float(load.get('value'))
    except (TypeError, ValueError):
        return False
    bike = service.get('key', '').upper() in ('MOTORCYCLE', 'BIKE', 'MOTORBIKE')
    bulky = str(dict(product).get('shipping_type', '')).lower() in ('bulky item', 'barang besar')
    return (load.get('unit') == 'kg' and math.isfinite(weight) and math.isfinite(limit)
            and 0 < weight <= limit and not (bike and bulky))


def service_name(key):
    return 'Bike / Motorcycle' if key.upper() in ('MOTORCYCLE', 'BIKE', 'MOTORBIKE') else key.replace('_', ' ').title()


def create_quote(con, user, product, qty, data, client=None):
    if METHODS.get(data.get('logistics_method')) == 'easyparcel':
        from parcel_delivery import create_quotes
        return create_quotes(con, user, product, qty, data)
    if data.get('fee_version') != 1:
        raise ValueError('Please refresh checkout to view the delivery fee breakdown.')
    ctx = context(con, user, product, qty, data)
    client = client or Client()
    cities = client.cities()
    city = next((c for c in cities if c['locode'] == ctx['city']), None)
    if data.get('service_options') is True and not data.get('service_type') and ctx['mode'] not in PM_RIDER_METHODS:
        offers = []
        for candidate in (city or {}).get('services', []):
            if not suitable_service(candidate, product, qty):
                continue
            try:
                offer = create_quote(con, user, product, qty, {**data, 'service_type': candidate['key']}, client)
            except LalamoveError:
                continue
            offers.append({**offer, 'service_type': candidate['key'], 'service_name': service_name(candidate['key'])})
        if not offers:
            raise ValueError('No Lalamove service is available for this package weight.')
        return {'offers': sorted(offers, key=lambda item: item['fee'])}
    if ctx['service_type'] == 'AUTO':
        eligible = [s for s in (city or {}).get('services', []) if suitable_service(s, product, qty)]
        if not eligible:
            raise ValueError('No suitable vehicle is available for this item and total package weight.')
        ctx['service_type'] = min(eligible, key=lambda s: float(s['load']['value']))['key']
    service = next((s for s in (city or {}).get('services', []) if s['key'] == ctx['service_type']), None)
    if not service:
        raise ValueError('Select an available city and vehicle.')
    if not suitable_service(service, product, qty):
        raise ValueError('This vehicle is not suitable for the item type or total package weight.')
    load = service.get('load', {})
    try:
        limit = float(load.get('value'))
        weight = float(product['weight_kg']) * qty
    except (TypeError, ValueError):
        raise ValueError('Package or vehicle weight information is missing.') from None
    if load.get('unit') != 'kg' or not math.isfinite(limit) or not math.isfinite(weight) or weight <= 0 or weight > limit:
        raise ValueError('The package weight exceeds this vehicle capacity or cannot be verified.')
    # PM riders use an immediate quote as a price reference only; never dispatch.
    quote = client.quote({**ctx, 'mode': 'express'} if ctx['mode'] in PM_RIDER_METHODS else ctx)
    courier = Decimal(str(quote['priceBreakdown']['total'])).quantize(Decimal('0.01'))
    charges = {'courier_fee': float(courier), 'admin_fee': float(ADMIN_FEE),
               'total': float(courier + ADMIN_FEE), 'version': 1}
    if ctx['mode'] == 'pm_pooling':
        total = ((courier + ADMIN_FEE) / 2).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        admin = ADMIN_FEE / 2
        charges.update(courier_fee=float(total - admin), admin_fee=float(admin),
                       total=float(total), pm_express_reference_total=float(courier + ADMIN_FEE))
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
        branch = branches.resolve(con, product, data.get('branch_id'))
        if branch:
            return 0.0, {'provider': 'pickup', 'context': {'branch': branch, 'pickup': branch['pickup']},
                         'pickup_contact': {'name': branch['name'], 'phone': branch['phone']},
                         'dispatch_status': 'self_pickup'}
        return 0.0, None
    ctx = context(con, user, product, qty, data)
    row = con.execute('SELECT * FROM delivery_quotes WHERE id=? AND buyer_id=?',
                      (str(data.get('quote_id') or ''), user['id'])).fetchone()
    if not row or row['used'] or row['expires_at'] <= time.time():
        raise ValueError('Your delivery quote has expired or was used. Request a new quote.')
    stored_context = json.loads(row['context'])
    if ctx.get('automatic_vehicle') and stored_context.get('automatic_vehicle'):
        ctx['service_type'] = stored_context['service_type']
    if stored_context != ctx:
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
    if ctx.get('branch'):
        seller = {'name': ctx['branch']['name'], 'phone': ctx['branch']['phone']}
    return charges['total'], {'context': ctx, 'quotation': quote, 'charges': charges,
                                                  'pickup_contact': dict(seller),
                                                  'recipient': {'name': user['name'], 'phone': str(data.get('buyer_phone') or user.get('phone') or '')},
                                                  **({'delivery_window': 'Up to 5 working days', 'max_working_days': 5} if method == 'pm_pooling' else {}),
                                                  'provider': method if method in (*PM_RIDER_METHODS, 'easyparcel') else 'lalamove',
                                                  'quote_provider': 'easyparcel' if method == 'easyparcel' else 'lalamove',
                                                  'dispatch_status': 'pm_rider_assignment_required' if method in PM_RIDER_METHODS else 'manual_booking_required'}
