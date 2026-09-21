"""Admin OAuth connection and token renewal. Shipment booking is separate."""
import base64
import hashlib
import json
import os
import secrets
import time
import threading
import urllib.parse
import urllib.request
from http.cookies import SimpleCookie
from cryptography.fernet import Fernet

PREFIX = '/api/integrations/easyparcel'
COOKIE = '__Host-pm_easyparcel'
LOGIN = 'https://api.easyparcel.com/oauth/login'
TOKEN = 'https://api.easyparcel.com/oauth/token'
REFRESH_LOCK = threading.Lock()


def refresh_if_needed(connect):
    # Complete token rotation in its own transaction, even if a later quote fails.
    with REFRESH_LOCK, connect() as con:
        migrate(con)
        row = con.execute("SELECT * FROM easyparcel_connection WHERE id='platform'").fetchone()
        if not row:
            raise ConnectionError('Connect EasyParcel in Admin Settings first.')
        if row['expires_at'] > time.time() + 60:
            return
        # Serialize rotating refresh tokens across server processes as well.
        con.execute("UPDATE easyparcel_connection SET expires_at=expires_at WHERE id='platform'")
        row = con.execute("SELECT * FROM easyparcel_connection WHERE id='platform'").fetchone()
        if row['expires_at'] > time.time() + 60:
            return
        try:
            tokens = json.loads(cipher().decrypt(row['encrypted_tokens'].encode()))
            client, secret, redirect = config()
            request = urllib.request.Request(TOKEN, method='POST', data=urllib.parse.urlencode({
                'grant_type': 'refresh_token', 'refresh_token': tokens['refresh_token'],
                'redirect_uri': redirect}).encode(), headers={
                    'Authorization': 'Basic ' + base64.b64encode((client + ':' + secret).encode()).decode(),
                    'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json'})
            with urllib.request.build_opener(NoRedirect).open(request, timeout=20) as response:
                fresh = json.loads(response.read(65536))
            if not fresh.get('access_token') or int(fresh.get('expires_in', 0)) <= 60 or str(fresh.get('token_type', '')).lower() != 'bearer':
                raise ValueError()
            tokens.update({k: fresh[k] for k in ('access_token', 'refresh_token', 'expires_in', 'refresh_token_expires_in') if k in fresh})
            con.execute("UPDATE easyparcel_connection SET encrypted_tokens=?,expires_at=? WHERE id='platform'",
                (cipher().encrypt(json.dumps(tokens).encode()).decode(), int(time.time()) + int(fresh['expires_in'])))
        except Exception:
            raise ConnectionError('EasyParcel authorization expired. Reconnect in Admin Settings.') from None


class ConnectionError(ValueError):
    pass


def config():
    client = os.environ.get('EASYPARCEL_CLIENT_ID', '').strip()
    secret = os.environ.get('EASYPARCEL_CLIENT_SECRET', '').strip()
    if not client or not secret:
        raise ConnectionError('EasyParcel credentials are missing in Render.')
    base = os.environ.get('PUBLIC_BASE_URL', 'https://pasarmalam-backend.onrender.com').rstrip('/')
    if not base.startswith('https://') or urllib.parse.urlparse(base).query:
        raise ConnectionError('EasyParcel requires an HTTPS backend URL.')
    return client, secret, base + PREFIX + '/callback'


def cipher():
    client, secret, _ = config()
    # Secret rotation intentionally requires reconnecting the account.
    key = hashlib.sha256(('pm-easyparcel-v1:' + client + ':' + secret).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def migrate(con):
    con.execute('''CREATE TABLE IF NOT EXISTS easyparcel_states (
        id TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, state_hash TEXT NOT NULL,
        browser_hash TEXT NOT NULL DEFAULT '', expires_at BIGINT NOT NULL,
        launched INTEGER NOT NULL DEFAULT 0, used INTEGER NOT NULL DEFAULT 0)''')
    con.execute('''CREATE TABLE IF NOT EXISTS easyparcel_connection (
        id TEXT PRIMARY KEY, encrypted_tokens TEXT NOT NULL, connected_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL, admin_id INTEGER NOT NULL)''')


def start(connect, admin_id):
    _, _, redirect = config()
    ticket, state = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    with connect() as con:
        migrate(con)
        con.execute('DELETE FROM easyparcel_states WHERE expires_at<? OR admin_id=?', (int(time.time()), admin_id))
        # The state is encrypted until it is sent to EasyParcel at launch.
        con.execute('INSERT INTO easyparcel_states (id,admin_id,state_hash,expires_at) VALUES (?,?,?,?)',
                    (digest(ticket), admin_id, cipher().encrypt(state.encode()).decode(), int(time.time()) + 600))
    return redirect.replace('/callback', '/authorize') + '?' + urllib.parse.urlencode({'ticket': ticket})


def launch(connect, ticket):
    client, _, redirect = config()
    browser = secrets.token_urlsafe(32)
    with connect() as con:
        migrate(con)
        row = con.execute('SELECT * FROM easyparcel_states WHERE id=?', (digest(ticket),)).fetchone()
        if not row or row['expires_at'] < time.time() or row['launched']:
            raise ConnectionError('Connection link expired. Start again from Admin Settings.')
        state = cipher().decrypt(row['state_hash'].encode()).decode()
        changed = con.execute('UPDATE easyparcel_states SET launched=1,state_hash=?,browser_hash=? WHERE id=? AND launched=0',
                              (digest(state), digest(browser), digest(ticket)))
        if changed.rowcount != 1:
            raise ConnectionError('Connection link already used.')
    return LOGIN + '?' + urllib.parse.urlencode({'client_id': client, 'redirect_uri': redirect, 'state': state}), browser


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def exchange(code, state):
    client, secret, redirect = config()
    request = urllib.request.Request(TOKEN, method='POST', data=urllib.parse.urlencode({
        'grant_type': 'authorization_code', 'redirect_uri': redirect, 'code': code, 'state': state
    }).encode(), headers={'Authorization': 'Basic ' + base64.b64encode((client + ':' + secret).encode()).decode(),
                         'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json'})
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=20) as response:
            data = json.loads(response.read(65536))
        if not isinstance(data, dict) or not isinstance(data.get('access_token'), str) or not data['access_token']:
            raise ValueError()
        expires = int(data.get('expires_in', 0))
        if expires <= 0 or str(data.get('token_type', '')).lower() != 'bearer':
            raise ValueError()
        return {k: data[k] for k in ('access_token', 'refresh_token', 'expires_in', 'refresh_token_expires_in') if k in data}
    except Exception:
        raise ConnectionError('EasyParcel authorization could not be completed. Reconnect and try again.') from None


def finish(connect, query, cookie_header):
    config()
    if any(len(query.get(k, [])) != 1 for k in ('state',)):
        raise ConnectionError('Invalid authorization state. Start again from Admin Settings.')
    state = query['state'][0]
    cookies = SimpleCookie()
    try:
        cookies.load(cookie_header or '')
        browser = cookies[COOKIE].value
    except Exception:
        raise ConnectionError('Browser verification missing. Start again from Admin Settings.') from None
    with connect() as con:
        migrate(con)
        row = con.execute('SELECT * FROM easyparcel_states WHERE state_hash=? AND launched=1', (digest(state),)).fetchone()
        if not row or row['used'] or row['expires_at'] < time.time() or not secrets.compare_digest(row['browser_hash'], digest(browser)):
            raise ConnectionError('Connection expired or already used. Start again from Admin Settings.')
        admin = con.execute('SELECT role,status FROM users WHERE id=?', (row['admin_id'],)).fetchone()
        if not admin or admin['role'] != 'admin' or admin['status'] != 'active':
            raise ConnectionError('Admin access is no longer active.')
        changed = con.execute('UPDATE easyparcel_states SET used=1 WHERE id=? AND used=0', (row['id'],))
        if changed.rowcount != 1:
            raise ConnectionError('Connection already used.')
    if 'error' in query:
        raise ConnectionError('EasyParcel permission was declined. No account was connected.')
    if len(query.get('code', [])) != 1 or not query['code'][0]:
        raise ConnectionError('Authorization code missing. Start again from Admin Settings.')
    tokens = exchange(query['code'][0], state)
    encrypted = cipher().encrypt(json.dumps(tokens).encode()).decode()
    now = int(time.time())
    with connect() as con:
        con.execute('''INSERT INTO easyparcel_connection (id,encrypted_tokens,connected_at,expires_at,admin_id)
            VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET encrypted_tokens=excluded.encrypted_tokens,
            connected_at=excluded.connected_at,expires_at=excluded.expires_at,admin_id=excluded.admin_id''',
            ('platform', encrypted, now, now + int(tokens['expires_in']), row['admin_id']))


def status(connect):
    try:
        config()
    except ConnectionError:
        return {'configured': False, 'connected': False, 'booking_enabled': False}
    with connect() as con:
        migrate(con)
        row = con.execute("SELECT * FROM easyparcel_connection WHERE id='platform'").fetchone()
    readable = False
    if row:
        try:
            cipher().decrypt(row['encrypted_tokens'].encode())
            readable = True
        except Exception:
            pass
    return {'configured': True, 'connected': readable,
            'access_token_expired': bool(row and row['expires_at'] <= time.time()),
            'connected_at': row['connected_at'] if readable else None, 'booking_enabled': False,
            'account_environment': 'Not verified; determined by the account selected in EasyParcel'}
