"""EasyParcel standard courier quotes. Booking/payment are intentionally separate."""
from decimal import Decimal, InvalidOperation
import json
import math
import re
import secrets
import time
import urllib.request

import branches
import easyparcel

STATES = {'johor': '01', 'kedah': '02', 'kelantan': '03', 'melaka': '04',
          'malacca': '04', 'negeri sembilan': '05', 'pahang': '06',
          'pulau pinang': '07', 'penang': '07', 'perak': '08', 'perlis': '09',
          'selangor': '10', 'terengganu': '11', 'sabah': '12', 'sarawak': '13',
          'kuala lumpur': '14', 'labuan': '15', 'putrajaya': '16'}
ELIGIBLE = {'Phones', 'Chargers', 'Phone Accessories', 'Electronics', 'Car Parts',
            'Hardware', 'Stationery', 'Toys', 'Shoes', 'Clothes'}


def postal(address, label):
    address = str(address or '')
    codes = set(re.findall(r'(?<!\d)\d{5}(?!\d)', address))
    states = {code for name, code in STATES.items()
              if re.search(r'\b' + re.escape(name) + r'\b', address, re.I)}
    if len(codes) != 1 or len(states) != 1:
        raise ValueError(label + ' must include one Malaysian postcode and state name for courier delivery.')
    return {'postcode': codes.pop(), 'subdivision_code': 'MY-' + states.pop(), 'country': 'MY'}


def context(con, user, product, qty, data):
    import delivery
    if product['category'] not in ELIGIBLE:
        raise ValueError('Standard parcel delivery is available for non-food goods only. Choose local delivery for this product.')
    seller = con.execute('SELECT status,seller_status FROM users WHERE id=?', (product['seller_id'],)).fetchone()
    if not seller or seller['status'] != 'active' or seller['seller_status'] != 'approved':
        raise ValueError('Seller is unavailable.')
    branch = branches.resolve(con, product, data.get('branch_id'))
    origin = branch['pickup'] if branch else delivery.pickup(con, product['seller_id'])
    if not origin:
        raise ValueError('The seller must save their pickup address first.')
    address = str(data.get('address') or '').strip()
    weight = float(product['weight_kg']) * qty
    if not math.isfinite(weight) or weight <= 0:
        raise ValueError('The seller must provide a valid parcel weight.')
    return {**({'branch': branch} if branch else {}), 'buyer_id': user['id'],
            'seller_id': product['seller_id'], 'product_id': product['id'],
            'quantity': qty, 'variant': str(data.get('variant') or ''),
            'price': str(product['price']), 'weight_kg': str(weight),
            'pickup': origin, 'dropoff': {'address': address}, 'mode': 'easyparcel',
            'sender': postal(origin['address'], 'Seller pickup address'),
            'receiver': postal(address, 'Delivery address')}


def request_rates(con, payload):
    row = con.execute("SELECT * FROM easyparcel_connection WHERE id='platform'").fetchone()
    if not row or row['expires_at'] <= time.time() + 30:
        raise ValueError('EasyParcel needs reconnecting in Admin Settings before courier quotes are available.')
    try:
        tokens = json.loads(easyparcel.cipher().decrypt(row['encrypted_tokens'].encode()))
        request = urllib.request.Request('https://api.easyparcel.com/open_api/2026-06/shipment/quotations',
            data=json.dumps({'shipment': [payload]}).encode(), method='POST', headers={
                'Authorization': 'Bearer ' + tokens['access_token'],
                'Content-Type': 'application/json', 'Accept': 'application/json'})
        with urllib.request.build_opener(easyparcel.NoRedirect).open(request, timeout=25) as response:
            result = json.loads(response.read(2_000_000))
        item = result['data'][0]
        if item['status'] != 'success':
            raise ValueError()
        return item['quotations']
    except Exception:
        raise ValueError('EasyParcel could not return rates. Check the addresses or try again later; no shipment was booked.') from None


def create_quotes(con, user, product, qty, data):
    import delivery
    if data.get('fee_version') != 1:
        raise ValueError('Refresh checkout to view the fee breakdown.')
    ctx = context(con, user, product, qty, data)
    rates = request_rates(con, {'sender': ctx['sender'], 'receiver': ctx['receiver'],
        'weight': float(ctx['weight_kg']), 'parcel_value': float(product['price']) * qty})
    offers = []
    expires = int(time.time()) + 300
    for rate in rates:
        try:
            pricing, courier = rate['pricing'], rate['courier']
            amount = Decimal(str(pricing['total_amount']))
            if pricing['currency'] != 'MYR' or not amount.is_finite() or amount < 0:
                continue
            # BYOC charges may be billed outside EasyParcel. Do not offer those here.
            if 'byoc_charges' in pricing or not courier.get('service_id'):
                continue
            amount = amount.quantize(Decimal('.01'))
            charges = {'courier_fee': float(amount), 'admin_fee': float(delivery.ADMIN_FEE),
                       'total': float(amount + delivery.ADMIN_FEE), 'version': 1}
            ident = secrets.token_urlsafe(32)
            con.execute('INSERT INTO delivery_quotes(id,buyer_id,context,quotation,expires_at,used) VALUES(?,?,?,?,?,0)',
                (ident, user['id'], json.dumps(ctx, sort_keys=True),
                 json.dumps({**rate, '_pasarmalam_charges': charges}), expires))
            offers.append({'quote_id': ident, 'fee': charges['total'], 'courier_fee': charges['courier_fee'],
                'admin_fee': charges['admin_fee'], 'fee_version': 1, 'currency': 'MYR',
                'expires_at': expires, 'mode': 'easyparcel', 'service_name': str(courier['service_name']),
                'delivery_duration': courier.get('delivery_duration')})
        except (KeyError, TypeError, InvalidOperation):
            continue
    if not offers:
        raise ValueError('No supported EasyParcel courier is available for this route and weight.')
    return {'offers': sorted(offers, key=lambda offer: offer['fee'])}
