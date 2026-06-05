from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from decimal import Decimal

DB_PATH = os.environ.get("PASARMALAM_DB", "pasarmalam.sqlite3")
DATABASE_URL = os.environ.get("DATABASE_URL", "")
USE_POSTGRES = DATABASE_URL.startswith(("postgres://", "postgresql://"))
PORT = int(os.environ.get("PORT", "8080"))
AUTH_SECRET = os.environ.get("AUTH_SECRET", "pasarmalam-dev-secret-change-me")


if USE_POSTGRES:
    import psycopg
    from psycopg.rows import dict_row


class CursorProxy:
    def __init__(self, cursor, lastrowid=None):
        self.cursor = cursor
        self.lastrowid = lastrowid

    def fetchone(self):
        return self.cursor.fetchone()

    def fetchall(self):
        return self.cursor.fetchall()

    def __iter__(self):
        return iter(self.cursor)


class DbConnection:
    def __init__(self, con):
        self.con = con

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type:
            self.con.rollback()
        else:
            self.con.commit()
        self.con.close()

    def execute(self, sql, params=None):
        params = params or []
        if USE_POSTGRES:
            sql = sql.replace("?", "%s")
            should_return_id = sql.lstrip().upper().startswith("INSERT ") and " RETURNING " not in sql.upper()
            if should_return_id:
                sql = sql.rstrip().rstrip(";") + " RETURNING id"
            cur = self.con.execute(sql, params)
            lastrowid = None
            if should_return_id:
                row = cur.fetchone()
                lastrowid = row["id"] if isinstance(row, dict) else row[0]
            return CursorProxy(cur, lastrowid)
        return self.con.execute(sql, params)

    def executemany(self, sql, rows):
        if USE_POSTGRES:
            sql = sql.replace("?", "%s")
            with self.con.cursor() as cur:
                return cur.executemany(sql, rows)
        return self.con.executemany(sql, rows)

    def executescript(self, script):
        if USE_POSTGRES:
            for statement in postgres_schema_statements():
                self.execute(statement)
            return None
        return self.con.executescript(script)


def connect():
    if USE_POSTGRES:
        return DbConnection(psycopg.connect(DATABASE_URL, row_factory=dict_row))
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return DbConnection(con)


def row_to_dict(row):
    if isinstance(row, dict):
        return dict(row)
    return {key: row[key] for key in row.keys()}


def now():
    return int(time.time())


def as_float(value):
    if isinstance(value, Decimal):
        return float(value)
    return float(value or 0)


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return f"pbkdf2_sha256${salt}${base64.urlsafe_b64encode(digest).decode('ascii')}"


def verify_password(password, stored):
    if not stored:
        return False
    if not stored.startswith("pbkdf2_sha256$"):
        return hmac.compare_digest(password, stored)
    _, salt, digest = stored.split("$", 2)
    expected = hash_password(password, salt)
    return hmac.compare_digest(expected, stored)


def make_token(user):
    payload = {"id": user["id"], "role": user["role"], "name": user["name"], "shop_name": user.get("shop_name", ""), "exp": now() + 60 * 60 * 24 * 30}
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).decode("ascii")
    sig = hmac.new(AUTH_SECRET.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"


def parse_token(token):
    if not token or "." not in token:
        return None
    body, sig = token.rsplit(".", 1)
    expected = hmac.new(AUTH_SECRET.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        return None
    payload = json.loads(base64.urlsafe_b64decode(body.encode("ascii")).decode("utf-8"))
    if payload.get("exp", 0) < now():
        return None
    return payload


def init_db():
    with connect() as con:
        con.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              role TEXT NOT NULL CHECK(role IN ('buyer','seller','admin')),
              name TEXT NOT NULL,
              phone TEXT DEFAULT '',
              email TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL,
              address TEXT DEFAULT '',
              shop_name TEXT DEFAULT '',
              status TEXT DEFAULT 'active',
              seller_status TEXT DEFAULT 'pending',
              created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS products (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              seller_id INTEGER DEFAULT 1,
              name TEXT NOT NULL,
              shop TEXT NOT NULL,
              category TEXT NOT NULL,
              price REAL NOT NULL,
              stock INTEGER NOT NULL DEFAULT 0,
              condition TEXT NOT NULL CHECK(condition IN ('New','Used')),
              price_mode TEXT NOT NULL CHECK(price_mode IN ('Fixed','Negotiable')),
              description TEXT DEFAULT '',
              warranty TEXT DEFAULT '',
              variants TEXT DEFAULT '[]',
              images TEXT DEFAULT '[]',
              image_url TEXT DEFAULT '',
              moderation_status TEXT DEFAULT 'approved',
              rating REAL DEFAULT 4.8,
              sold INTEGER DEFAULT 0,
              shipping_type TEXT DEFAULT 'Standard Rider',
              weight_kg REAL DEFAULT 0.5,
              created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS cart_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              buyer_id INTEGER NOT NULL DEFAULT 1,
              product_id INTEGER NOT NULL,
              quantity INTEGER NOT NULL DEFAULT 1,
              variant TEXT DEFAULT '',
              created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS wishlist (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              buyer_id INTEGER NOT NULL DEFAULT 1,
              product_id INTEGER NOT NULL,
              created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              product_id INTEGER,
              buyer_name TEXT NOT NULL,
              seller_name TEXT NOT NULL,
              sender_role TEXT NOT NULL CHECK(sender_role IN ('buyer','seller')),
              body TEXT NOT NULL,
              created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reviews (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              product_id INTEGER,
              seller_id INTEGER DEFAULT 1,
              buyer_name TEXT NOT NULL,
              rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
              title TEXT NOT NULL,
              body TEXT NOT NULL,
              seller_reply TEXT DEFAULT '',
              created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS orders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              buyer_id INTEGER DEFAULT 1,
              buyer_name TEXT NOT NULL,
              product_id INTEGER NOT NULL,
              quantity INTEGER NOT NULL DEFAULT 1,
              variant TEXT DEFAULT '',
              address TEXT DEFAULT '',
              total REAL NOT NULL,
              logistics_method TEXT NOT NULL,
              logistics_fee REAL NOT NULL,
              payment_method TEXT DEFAULT 'E-Wallet',
              payment_status TEXT NOT NULL DEFAULT 'unpaid',
              order_status TEXT NOT NULL DEFAULT 'placed',
              escrow_status TEXT NOT NULL DEFAULT 'holding',
              tracking_no TEXT DEFAULT '',
              awb_label TEXT DEFAULT '',
              created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS returns (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              buyer_id INTEGER DEFAULT 1,
              order_id INTEGER NOT NULL,
              buyer_name TEXT NOT NULL,
              reason TEXT NOT NULL,
              request_type TEXT NOT NULL DEFAULT 'Return/Refund',
              status TEXT NOT NULL DEFAULT 'requested',
              evidence_url TEXT DEFAULT '',
              seller_response TEXT DEFAULT '',
              dispute_status TEXT DEFAULT 'open',
              created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS campaigns (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              seller_id INTEGER DEFAULT 1,
              name TEXT NOT NULL,
              type TEXT NOT NULL,
              value TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'active',
              created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS wallet (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              seller_id INTEGER DEFAULT 1,
              type TEXT NOT NULL,
              amount REAL NOT NULL,
              note TEXT DEFAULT '',
              created_at INTEGER NOT NULL
            );
            """
        )
        migrate_products(con)
        migrate_orders(con)
        migrate_reviews(con)
        migrate_returns(con)
        migrate_users(con)
        migrate_passwords(con)
        seed(con)


def postgres_schema_statements():
    return [
        """
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          role TEXT NOT NULL CHECK(role IN ('buyer','seller','admin')),
          name TEXT NOT NULL,
          phone TEXT DEFAULT '',
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          address TEXT DEFAULT '',
          shop_name TEXT DEFAULT '',
          status TEXT DEFAULT 'active',
          seller_status TEXT DEFAULT 'pending',
          created_at INTEGER NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          seller_id INTEGER DEFAULT 1,
          name TEXT NOT NULL,
          shop TEXT NOT NULL,
          category TEXT NOT NULL,
          price DOUBLE PRECISION NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0,
          condition TEXT NOT NULL CHECK(condition IN ('New','Used')),
          price_mode TEXT NOT NULL CHECK(price_mode IN ('Fixed','Negotiable')),
          description TEXT DEFAULT '',
          warranty TEXT DEFAULT '',
          variants TEXT DEFAULT '[]',
          images TEXT DEFAULT '[]',
          image_url TEXT DEFAULT '',
          moderation_status TEXT DEFAULT 'approved',
          rating DOUBLE PRECISION DEFAULT 4.8,
          sold INTEGER DEFAULT 0,
          shipping_type TEXT DEFAULT 'Standard Rider',
          weight_kg DOUBLE PRECISION DEFAULT 0.5,
          created_at INTEGER NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS cart_items (
          id SERIAL PRIMARY KEY,
          buyer_id INTEGER NOT NULL DEFAULT 1,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          variant TEXT DEFAULT '',
          created_at INTEGER NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS wishlist (
          id SERIAL PRIMARY KEY,
          buyer_id INTEGER NOT NULL DEFAULT 1,
          product_id INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          product_id INTEGER,
          buyer_name TEXT NOT NULL,
          seller_name TEXT NOT NULL,
          sender_role TEXT NOT NULL CHECK(sender_role IN ('buyer','seller')),
          body TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          product_id INTEGER,
          seller_id INTEGER DEFAULT 1,
          buyer_name TEXT NOT NULL,
          rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          seller_reply TEXT DEFAULT '',
          created_at INTEGER NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          buyer_id INTEGER DEFAULT 1,
          buyer_name TEXT NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          variant TEXT DEFAULT '',
          address TEXT DEFAULT '',
          total DOUBLE PRECISION NOT NULL,
          logistics_method TEXT NOT NULL,
          logistics_fee DOUBLE PRECISION NOT NULL,
          payment_method TEXT DEFAULT 'E-Wallet',
          payment_status TEXT NOT NULL DEFAULT 'unpaid',
          order_status TEXT NOT NULL DEFAULT 'placed',
          escrow_status TEXT NOT NULL DEFAULT 'holding',
          tracking_no TEXT DEFAULT '',
          awb_label TEXT DEFAULT '',
          created_at INTEGER NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS returns (
          id SERIAL PRIMARY KEY,
          buyer_id INTEGER DEFAULT 1,
          order_id INTEGER NOT NULL,
          buyer_name TEXT NOT NULL,
          reason TEXT NOT NULL,
          request_type TEXT NOT NULL DEFAULT 'Return/Refund',
          status TEXT NOT NULL DEFAULT 'requested',
          evidence_url TEXT DEFAULT '',
          seller_response TEXT DEFAULT '',
          dispute_status TEXT DEFAULT 'open',
          created_at INTEGER NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS campaigns (
          id SERIAL PRIMARY KEY,
          seller_id INTEGER DEFAULT 1,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          value TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          created_at INTEGER NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS wallet (
          id SERIAL PRIMARY KEY,
          seller_id INTEGER DEFAULT 1,
          type TEXT NOT NULL,
          amount DOUBLE PRECISION NOT NULL,
          note TEXT DEFAULT '',
          created_at INTEGER NOT NULL
        )
        """,
    ]


def table_columns(con, table):
    if USE_POSTGRES:
        rows = con.execute(
            """
            SELECT column_name AS name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ?
            """,
            (table,),
        )
        return {row["name"] for row in rows}
    return {row["name"] for row in con.execute(f"PRAGMA table_info({table})")}


def migrate_products(con):
    columns = table_columns(con, "products")
    additions = {
        "seller_id": "INTEGER DEFAULT 1",
        "warranty": "TEXT DEFAULT ''",
        "variants": "TEXT DEFAULT '[]'",
        "images": "TEXT DEFAULT '[]'",
        "image_url": "TEXT DEFAULT ''",
        "moderation_status": "TEXT DEFAULT 'approved'",
        "rating": "REAL DEFAULT 4.8",
        "sold": "INTEGER DEFAULT 0",
        "shipping_type": "TEXT DEFAULT 'Standard Rider'",
        "weight_kg": "REAL DEFAULT 0.5",
    }
    for name, sql in additions.items():
        if name not in columns:
            con.execute(f"ALTER TABLE products ADD COLUMN {name} {sql}")


def migrate_orders(con):
    columns = table_columns(con, "orders")
    additions = {
        "buyer_id": "INTEGER DEFAULT 1",
        "variant": "TEXT DEFAULT ''",
        "address": "TEXT DEFAULT ''",
        "payment_method": "TEXT DEFAULT 'E-Wallet'",
        "escrow_status": "TEXT DEFAULT 'holding'",
        "tracking_no": "TEXT DEFAULT ''",
        "awb_label": "TEXT DEFAULT ''",
    }
    for name, sql in additions.items():
        if name not in columns:
            con.execute(f"ALTER TABLE orders ADD COLUMN {name} {sql}")


def migrate_reviews(con):
    columns = table_columns(con, "reviews")
    if "seller_id" not in columns:
        con.execute("ALTER TABLE reviews ADD COLUMN seller_id INTEGER DEFAULT 1")


def migrate_returns(con):
    columns = table_columns(con, "returns")
    if "buyer_id" not in columns:
        con.execute("ALTER TABLE returns ADD COLUMN buyer_id INTEGER DEFAULT 1")
    if "dispute_status" not in columns:
        con.execute("ALTER TABLE returns ADD COLUMN dispute_status TEXT DEFAULT 'open'")


def migrate_users(con):
    columns = table_columns(con, "users")
    additions = {
        "status": "TEXT DEFAULT 'active'",
        "seller_status": "TEXT DEFAULT 'pending'",
    }
    for name, sql in additions.items():
        if name not in columns:
            con.execute(f"ALTER TABLE users ADD COLUMN {name} {sql}")


def migrate_passwords(con):
    rows = con.execute("SELECT id, password FROM users")
    for row in rows:
        password = row["password"]
        if password and not password.startswith("pbkdf2_sha256$"):
            con.execute("UPDATE users SET password = ? WHERE id = ?", (hash_password(password), row["id"]))


def seed(con):
    if con.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"] == 0:
        con.executemany(
            """
            INSERT INTO users (role, name, phone, email, password, address, shop_name, status, seller_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("buyer", "Aina Buyer", "0123456789", "buyer@pasarmalam.my", hash_password("demo123"), "Kuala Lumpur", "", "active", "not_applicable", now()),
                ("seller", "PM Seller", "01122223333", "seller@pasarmalam.my", hash_password("demo123"), "Petaling Jaya", "PasarMalam Seller", "active", "approved", now()),
                ("admin", "PM Admin", "0100000000", "admin@pasarmalam.my", hash_password("admin123"), "HQ", "", "active", "not_applicable", now()),
            ],
        )
    if con.execute("SELECT COUNT(*) AS c FROM products").fetchone()["c"] == 0:
        rows = [
            ("Used iPhone 12 128GB", "Mobile Malam", "Phones", 899, 3, "Used", "Negotiable", "Verified used phone", "7-day shop warranty", '["128GB","Black","Used A grade"]', "Standard Rider", 0.4),
            ("USB-C fast charger 30W", "Gerai Gadget", "Chargers", 29.9, 20, "New", "Negotiable", "Fast charging adapter", "7-day shop warranty", '["30W","White","Type-C"]', "Standard Rider", 0.2),
            ("Bluetooth speaker mini", "Tech Lane", "Electronics", 45, 16, "New", "Fixed", "Portable speaker", "14-day warranty", '["Black","Blue"]', "Standard Rider", 0.6),
            ("Used Myvi headlamp", "Auto Parts Corner", "Car Parts", 120, 2, "Used", "Negotiable", "Left side headlamp", "No warranty for used part", '["Left side","Used"]', "Bulky Item", 2.8),
            ("Running shoes size 42", "Lorong Bundle", "Shoes", 55, 6, "Used", "Negotiable", "Clean used shoes", "As-is", '["Size 42","Used"]', "Standard Rider", 0.8),
            ("Cotton baju kurung set", "Cantik Craft", "Clothes", 38, 18, "New", "Fixed", "Local clothing", "Exchange size in 7 days", '["S","M","L"]', "Standard Rider", 0.5),
            ("Satay ayam set", "Abang Din Satay", "Food", 12.9, 48, "New", "Fixed", "Fresh pasar malam food", "Fresh item, no return", '["10 sticks","20 sticks"]', "In-Store Pickup", 0.3),
            ("Air balang mango float", "Balang Boss", "Drinks", 6.5, 35, "New", "Fixed", "Cold drink", "Fresh item, no return", '["Small","Large"]', "In-Store Pickup", 0.7),
        ]
        con.executemany(
            """
            INSERT INTO products
            (seller_id, name, shop, category, price, stock, condition, price_mode, description, warranty, variants, images, image_url, rating, sold, shipping_type, weight_kg, created_at)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '', 4.8, 0, ?, ?, ?)
            """,
            [(*row, now()) for row in rows],
        )
    if con.execute("SELECT COUNT(*) AS c FROM campaigns").fetchone()["c"] == 0:
        con.executemany(
            "INSERT INTO campaigns (seller_id, name, type, value, status, created_at) VALUES (1, ?, ?, ?, 'active', ?)",
            [("Flash Sale Slot", "flash_sale", "10% off", now()), ("Seller Voucher RM5", "voucher", "RM5 above RM50", now()), ("Free Shipping Campaign", "shipping", "RM0 pickup", now())],
        )
    if con.execute("SELECT COUNT(*) AS c FROM wallet").fetchone()["c"] == 0:
        con.executemany(
            "INSERT INTO wallet (seller_id, type, amount, note, created_at) VALUES (1, ?, ?, ?, ?)",
            [("settlement", 2842, "Completed orders", now()), ("fee", -142.1, "Platform fee estimate", now()), ("refund", -55, "Return refund reserve", now())],
        )
    if con.execute("SELECT COUNT(*) AS c FROM reviews").fetchone()["c"] == 0:
        con.executemany(
            "INSERT INTO reviews (product_id, seller_id, buyer_name, rating, title, body, seller_reply, created_at) VALUES (?, 1, ?, ?, ?, ?, ?, ?)",
            [(1, "Aina", 5, "Fast reply", "Item condition matched the listing.", "Thank you.", now()), (2, "Jason", 4, "Good charger", "Works well and fair price.", "", now())],
        )


def read_json(handler):
    length = int(handler.headers.get("Content-Length", "0") or "0")
    if length > 2_000_000:
        raise ValueError("Request body too large")
    if length == 0:
        return {}
    return json.loads(handler.rfile.read(length).decode("utf-8"))


def send_json(handler, status, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-PM-Token")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    if status != 204:
        handler.wfile.write(body)


class Handler(BaseHTTPRequestHandler):
    def current_user(self):
        auth = self.headers.get("Authorization", "")
        token = self.headers.get("X-PM-Token", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
        return parse_token(token)

    def require_user(self, role=None):
        user = self.current_user()
        if not user:
            raise PermissionError("Login required")
        if role and user["role"] != role:
            raise PermissionError(f"{role} access required")
        return user

    def do_HEAD(self):
        self.send_response(200)
        self.end_headers()

    def do_OPTIONS(self):
        send_json(self, 204, {})

    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        try:
            routes = {
                "/api/health": lambda: send_json(self, 200, {"ok": True, "service": "PasarMalam API", "features": "marketplace"}),
                "/api/products": lambda: self.get_products(query),
                "/api/messages": lambda: self.list_table("messages", "messages"),
                "/api/reviews": lambda: self.list_table("reviews", "reviews"),
                "/api/orders": self.get_orders,
                "/api/cart": lambda: self.get_cart(query),
                "/api/wishlist": self.get_wishlist,
                "/api/returns": self.get_returns,
                "/api/campaigns": lambda: self.list_table("campaigns", "campaigns"),
                "/api/wallet": lambda: self.list_table("wallet", "wallet"),
                "/api/metrics": self.get_metrics,
                "/api/logistics/rates": self.get_logistics_rates,
                "/api/admin/users": self.admin_users,
                "/api/admin/sellers": self.admin_sellers,
                "/api/admin/products": self.admin_products,
                "/api/admin/orders": self.admin_orders,
                "/api/admin/returns": self.admin_returns,
                "/api/admin/metrics": self.admin_metrics,
            }
            route = routes.get(parsed.path)
            if route:
                route()
            else:
                send_json(self, 404, {"error": "Not found"})
        except PermissionError as exc:
            send_json(self, 401, {"error": str(exc)})
        except Exception as exc:
            send_json(self, 500, {"error": str(exc)})

    def do_POST(self):
        self.write_route("POST")

    def do_PUT(self):
        self.write_route("PUT")

    def do_DELETE(self):
        self.write_route("DELETE")

    def write_route(self, method):
        parsed = urlparse(self.path)
        try:
            data = read_json(self)
            if parsed.path == "/api/auth/signup":
                self.signup(data)
            elif parsed.path == "/api/auth/login":
                self.login(data)
            elif parsed.path == "/api/auth/password-reset":
                send_json(self, 200, {"ok": True, "message": "Password reset link sent in demo mode"})
            elif parsed.path == "/api/products" and method == "POST":
                self.create_product(data)
            elif parsed.path.startswith("/api/products/"):
                self.product_by_id(method, parsed.path, data)
            elif parsed.path == "/api/cart":
                user = self.current_user()
                self.create_simple("cart_items", data, {"buyer_id": user["id"] if user and user["role"] == "buyer" else 1, "quantity": 1, "variant": ""})
            elif parsed.path == "/api/wishlist":
                user = self.current_user()
                self.create_simple("wishlist", data, {"buyer_id": user["id"] if user and user["role"] == "buyer" else 1})
            elif parsed.path == "/api/messages":
                self.create_simple("messages", data, {"product_id": None, "buyer_name": "Buyer", "seller_name": "PasarMalam Seller"})
            elif parsed.path == "/api/reviews":
                self.create_simple("reviews", data, {"product_id": None, "seller_id": 1, "buyer_name": "Buyer", "seller_reply": ""})
            elif parsed.path == "/api/checkout":
                self.checkout(data)
            elif parsed.path == "/api/orders/status":
                self.update_order_status(data)
            elif parsed.path == "/api/returns":
                user = self.current_user()
                self.create_simple("returns", data, {"buyer_id": user["id"] if user and user["role"] == "buyer" else 1, "buyer_name": user["name"] if user else "Buyer", "request_type": "Return/Refund", "status": "requested", "evidence_url": "", "seller_response": ""})
            elif parsed.path == "/api/campaigns":
                self.create_simple("campaigns", data, {"seller_id": 1, "status": "active"})
            elif parsed.path == "/api/logistics/awb":
                self.awb(data)
            elif parsed.path == "/api/admin/user-status":
                self.admin_update_user_status(data)
            elif parsed.path == "/api/admin/product-status":
                self.admin_update_product_status(data)
            elif parsed.path == "/api/admin/return-status":
                self.admin_update_return_status(data)
            else:
                send_json(self, 404, {"error": "Not found"})
        except PermissionError as exc:
            send_json(self, 401, {"error": str(exc)})
        except Exception as exc:
            send_json(self, 400, {"error": str(exc)})

    def list_table(self, table, key):
        with connect() as con:
            rows = [row_to_dict(row) for row in con.execute(f"SELECT * FROM {table} ORDER BY created_at DESC, id DESC")]
        send_json(self, 200, {key: rows})

    def get_products(self, query):
        category = query.get("category", [""])[0]
        sql = "SELECT * FROM products"
        params = []
        if category:
            sql += " WHERE category = ?"
            params.append(category)
        sql += " ORDER BY created_at DESC, id DESC"
        with connect() as con:
            rows = [row_to_dict(row) for row in con.execute(sql, params)]
        for row in rows:
            row["images"] = json.loads(row.get("images") or "[]")
            row["variants"] = json.loads(row.get("variants") or "[]")
        send_json(self, 200, {"products": rows})

    def create_product(self, data):
        user = self.current_user()
        required = ["name", "shop", "category", "price", "stock", "condition", "price_mode"]
        for key in required:
            if key not in data:
                raise ValueError(f"Missing {key}")
        images = data.get("images") or ([data.get("image_url")] if data.get("image_url") else [])
        variants = data.get("variants") or []
        seller_id = user["id"] if user and user["role"] == "seller" else int(data.get("seller_id", 1))
        shop = user.get("shop_name") or user.get("name") if user and user["role"] == "seller" else data["shop"]
        with connect() as con:
            cur = con.execute(
                """
                INSERT INTO products
                (seller_id, name, shop, category, price, stock, condition, price_mode, description, warranty, variants, images, image_url, shipping_type, weight_kg, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    seller_id,
                    data["name"],
                    shop,
                    data["category"],
                    float(data["price"]),
                    int(data["stock"]),
                    data["condition"],
                    data["price_mode"],
                    data.get("description", ""),
                    data.get("warranty", ""),
                    json.dumps(variants),
                    json.dumps(images),
                    images[0] if images else data.get("image_url", ""),
                    data.get("shipping_type", "Standard Rider"),
                    float(data.get("weight_kg", 0.5)),
                    now(),
                ),
            )
        send_json(self, 201, {"id": cur.lastrowid})

    def product_by_id(self, method, path, data):
        product_id = int(path.rsplit("/", 1)[-1])
        user = self.current_user()
        with connect() as con:
            product = con.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
            if not product:
                raise ValueError("Product not found")
            if user and user["role"] == "seller" and int(product["seller_id"]) != int(user["id"]):
                raise PermissionError("Seller cannot manage another seller product")
            if method == "DELETE":
                con.execute("DELETE FROM products WHERE id = ?", (product_id,))
                send_json(self, 200, {"ok": True})
                return
            allowed = ["name", "shop", "category", "price", "stock", "condition", "price_mode", "description", "warranty", "shipping_type", "weight_kg"]
            updates = {key: data[key] for key in allowed if key in data}
            if "variants" in data:
                updates["variants"] = json.dumps(data["variants"])
            if "images" in data:
                updates["images"] = json.dumps(data["images"])
                updates["image_url"] = data["images"][0] if data["images"] else ""
            if not updates:
                raise ValueError("No fields to update")
            sql = ", ".join([f"{key} = ?" for key in updates])
            con.execute(f"UPDATE products SET {sql} WHERE id = ?", [*updates.values(), product_id])
        send_json(self, 200, {"ok": True})

    def create_simple(self, table, data, defaults):
        payload = {**defaults, **data, "created_at": now()}
        for protected_key in ("buyer_id", "seller_id"):
            if protected_key in defaults:
                payload[protected_key] = defaults[protected_key]
        keys = list(payload.keys())
        placeholders = ", ".join(["?"] * len(keys))
        with connect() as con:
            cur = con.execute(f"INSERT INTO {table} ({', '.join(keys)}) VALUES ({placeholders})", [payload[key] for key in keys])
        send_json(self, 201, {"id": cur.lastrowid})

    def signup(self, data):
        required = ["role", "name", "email", "password"]
        for key in required:
            if key not in data:
                raise ValueError(f"Missing {key}")
        with connect() as con:
            cur = con.execute(
                "INSERT INTO users (role, name, phone, email, password, address, shop_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (data["role"], data["name"], data.get("phone", ""), data["email"], hash_password(data["password"]), data.get("address", ""), data.get("shop_name", ""), now()),
            )
        user = {"id": cur.lastrowid, "role": data["role"], "name": data["name"], "email": data["email"], "shop_name": data.get("shop_name", "")}
        send_json(self, 201, {"token": make_token(user), "user": user})

    def login(self, data):
        with connect() as con:
            row = con.execute("SELECT * FROM users WHERE email = ?", (data.get("email"),)).fetchone()
        if not row:
            send_json(self, 401, {"error": "Invalid login"})
            return
        user = row_to_dict(row)
        if not verify_password(data.get("password", ""), user["password"]):
            send_json(self, 401, {"error": "Invalid login"})
            return
        if not user["password"].startswith("pbkdf2_sha256$"):
            with connect() as con:
                con.execute("UPDATE users SET password = ? WHERE id = ?", (hash_password(data.get("password", "")), user["id"]))
        user.pop("password", None)
        send_json(self, 200, {"token": make_token(user), "user": user})

    def get_cart(self, query):
        user = self.current_user()
        buyer_id = user["id"] if user and user["role"] == "buyer" else 1
        with connect() as con:
            rows = [
                row_to_dict(row)
                for row in con.execute(
                    """
                    SELECT cart_items.*, products.name, products.price, products.shop, products.image_url
                    FROM cart_items JOIN products ON products.id = cart_items.product_id
                    WHERE cart_items.buyer_id = ?
                    ORDER BY cart_items.created_at DESC
                    """,
                    (buyer_id,),
                )
            ]
        send_json(self, 200, {"cart": rows})

    def get_wishlist(self):
        user = self.current_user()
        buyer_id = user["id"] if user and user["role"] == "buyer" else 1
        with connect() as con:
            rows = [row_to_dict(row) for row in con.execute("SELECT * FROM wishlist WHERE buyer_id = ? ORDER BY created_at DESC, id DESC", (buyer_id,))]
        send_json(self, 200, {"wishlist": rows})

    def get_orders(self):
        user = self.current_user()
        with connect() as con:
            if user and user["role"] == "buyer":
                rows = [row_to_dict(row) for row in con.execute("SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC, id DESC", (user["id"],))]
            elif user and user["role"] == "seller":
                rows = [
                    row_to_dict(row)
                    for row in con.execute(
                        """
                        SELECT orders.*
                        FROM orders JOIN products ON products.id = orders.product_id
                        WHERE products.seller_id = ?
                        ORDER BY orders.created_at DESC, orders.id DESC
                        """,
                        (user["id"],),
                    )
                ]
            else:
                rows = [row_to_dict(row) for row in con.execute("SELECT * FROM orders ORDER BY created_at DESC, id DESC")]
        send_json(self, 200, {"orders": rows})

    def get_returns(self):
        user = self.current_user()
        with connect() as con:
            if user and user["role"] == "buyer":
                rows = [row_to_dict(row) for row in con.execute("SELECT * FROM returns WHERE buyer_id = ? ORDER BY created_at DESC, id DESC", (user["id"],))]
            elif user and user["role"] == "seller":
                rows = [
                    row_to_dict(row)
                    for row in con.execute(
                        """
                        SELECT returns.*
                        FROM returns
                        JOIN orders ON orders.id = returns.order_id
                        JOIN products ON products.id = orders.product_id
                        WHERE products.seller_id = ?
                        ORDER BY returns.created_at DESC, returns.id DESC
                        """,
                        (user["id"],),
                    )
                ]
            else:
                rows = [row_to_dict(row) for row in con.execute("SELECT * FROM returns ORDER BY created_at DESC, id DESC")]
        send_json(self, 200, {"returns": rows})

    def checkout(self, data):
        user = self.current_user()
        buyer_id = user["id"] if user and user["role"] == "buyer" else int(data.get("buyer_id", 1))
        buyer_name = user["name"] if user and user["role"] == "buyer" else data.get("buyer_name", "Buyer")
        with connect() as con:
            product = con.execute("SELECT * FROM products WHERE id = ?", (int(data["product_id"]),)).fetchone()
            if not product:
                raise ValueError("Product not found")
            qty = int(data.get("quantity", 1))
            fee = float(data.get("logistics_fee", shipping_fee(data.get("logistics_method", product["shipping_type"]), product["weight_kg"])))
            total = float(product["price"]) * qty + fee
            tracking = f"PM{now()}{product['id']}"
            awb = f"AWB-{tracking}-{data.get('logistics_method', product['shipping_type']).replace(' ', '-')}"
            cur = con.execute(
                """
                INSERT INTO orders
                (buyer_id, buyer_name, product_id, quantity, variant, address, total, logistics_method, logistics_fee, payment_method, payment_status, order_status, escrow_status, tracking_no, awb_label, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'placed', 'holding', ?, ?, ?)
                """,
                (buyer_id, buyer_name, product["id"], qty, data.get("variant", ""), data.get("address", ""), total, data.get("logistics_method", product["shipping_type"]), fee, data.get("payment_method", "E-Wallet"), tracking, awb, now()),
            )
            if USE_POSTGRES:
                con.execute("UPDATE products SET stock = GREATEST(stock - ?, 0), sold = sold + ? WHERE id = ?", (qty, qty, product["id"]))
            else:
                con.execute("UPDATE products SET stock = MAX(stock - ?, 0), sold = sold + ? WHERE id = ?", (qty, qty, product["id"]))
        send_json(self, 201, {"id": cur.lastrowid, "total": total, "tracking_no": tracking, "escrow_status": "holding"})

    def update_order_status(self, data):
        status = data["order_status"]
        escrow = "released" if status == "completed" else data.get("escrow_status", "holding")
        user = self.current_user()
        with connect() as con:
            if user and user["role"] == "seller":
                row = con.execute(
                    """
                    SELECT orders.id
                    FROM orders JOIN products ON products.id = orders.product_id
                    WHERE orders.id = ? AND products.seller_id = ?
                    """,
                    (int(data["order_id"]), user["id"]),
                ).fetchone()
                if not row:
                    raise PermissionError("Seller cannot update another seller order")
            con.execute("UPDATE orders SET order_status = ?, escrow_status = ? WHERE id = ?", (status, escrow, int(data["order_id"])))
        send_json(self, 200, {"ok": True, "escrow_status": escrow})

    def awb(self, data):
        awb = f"PM-AWB-{int(data.get('order_id', 0)):06d}"
        send_json(self, 200, {"awb_label": awb, "print_text": f"PasarMalam Shipping Label {awb}"})

    def get_logistics_rates(self):
        rows = [
            {"method": "In-Store Pickup", "fee": 0, "eta": "Tonight", "tracking": False},
            {"method": "Standard Rider", "fee": 4.9, "eta": "1-2 days", "tracking": True},
            {"method": "Express Rider", "fee": 8.9, "eta": "Same night", "tracking": True},
            {"method": "Bulky Item", "fee": 12.9, "eta": "2-4 days", "tracking": True},
            {"method": "Seller Own Fleet", "fee": 6.9, "eta": "Seller arranged", "tracking": False},
        ]
        send_json(self, 200, {"rates": rows})

    def get_metrics(self):
        with connect() as con:
            orders = con.execute("SELECT COUNT(*) AS c, COALESCE(SUM(total),0) AS total FROM orders").fetchone()
            reviews = con.execute("SELECT COALESCE(AVG(rating),0) AS rating FROM reviews").fetchone()
            products = con.execute("SELECT COUNT(*) AS c FROM products").fetchone()
        send_json(
            self,
            200,
            {
                "live_products": products["c"],
                "orders": orders["c"],
                "sales": round(as_float(orders["total"]), 2),
                "response_rate": 98,
                "late_shipment_rate": 1.2,
                "cancellation_rate": 0.8,
                "rating": round(as_float(reviews["rating"]), 1),
            },
        )

    def admin_users(self):
        self.require_user("admin")
        with connect() as con:
            rows = [row_to_dict(row) for row in con.execute("SELECT id, role, name, phone, email, address, shop_name, status, seller_status, created_at FROM users ORDER BY created_at DESC, id DESC")]
        send_json(self, 200, {"users": rows})

    def admin_sellers(self):
        self.require_user("admin")
        with connect() as con:
            rows = [row_to_dict(row) for row in con.execute("SELECT id, role, name, phone, email, address, shop_name, status, seller_status, created_at FROM users WHERE role = 'seller' ORDER BY created_at DESC, id DESC")]
        send_json(self, 200, {"sellers": rows})

    def admin_products(self):
        self.require_user("admin")
        with connect() as con:
            rows = [row_to_dict(row) for row in con.execute("SELECT * FROM products ORDER BY created_at DESC, id DESC")]
        for row in rows:
            row["images"] = json.loads(row.get("images") or "[]")
            row["variants"] = json.loads(row.get("variants") or "[]")
        send_json(self, 200, {"products": rows})

    def admin_orders(self):
        self.require_user("admin")
        with connect() as con:
            rows = [
                row_to_dict(row)
                for row in con.execute(
                    """
                    SELECT orders.*, products.name AS product_name, products.shop AS seller_shop, products.seller_id
                    FROM orders JOIN products ON products.id = orders.product_id
                    ORDER BY orders.created_at DESC, orders.id DESC
                    """
                )
            ]
        send_json(self, 200, {"orders": rows})

    def admin_returns(self):
        self.require_user("admin")
        with connect() as con:
            rows = [
                row_to_dict(row)
                for row in con.execute(
                    """
                    SELECT returns.*, orders.product_id, products.name AS product_name, products.shop AS seller_shop
                    FROM returns
                    LEFT JOIN orders ON orders.id = returns.order_id
                    LEFT JOIN products ON products.id = orders.product_id
                    ORDER BY returns.created_at DESC, returns.id DESC
                    """
                )
            ]
        send_json(self, 200, {"returns": rows})

    def admin_metrics(self):
        self.require_user("admin")
        with connect() as con:
            users = con.execute("SELECT COUNT(*) AS c FROM users").fetchone()
            sellers = con.execute("SELECT COUNT(*) AS c FROM users WHERE role = 'seller'").fetchone()
            buyers = con.execute("SELECT COUNT(*) AS c FROM users WHERE role = 'buyer'").fetchone()
            products = con.execute("SELECT COUNT(*) AS c FROM products").fetchone()
            orders = con.execute("SELECT COUNT(*) AS c, COALESCE(SUM(total),0) AS total FROM orders").fetchone()
            returns = con.execute("SELECT COUNT(*) AS c FROM returns").fetchone()
            campaigns = con.execute("SELECT COUNT(*) AS c FROM campaigns").fetchone()
        send_json(
            self,
            200,
            {
                "users": users["c"],
                "buyers": buyers["c"],
                "sellers": sellers["c"],
                "products": products["c"],
                "orders": orders["c"],
                "sales": round(as_float(orders["total"]), 2),
                "returns": returns["c"],
                "campaigns": campaigns["c"],
            },
        )

    def admin_update_user_status(self, data):
        self.require_user("admin")
        with connect() as con:
            con.execute(
                "UPDATE users SET status = ?, seller_status = ? WHERE id = ?",
                (data.get("status", "active"), data.get("seller_status", "pending"), int(data["user_id"])),
            )
        send_json(self, 200, {"ok": True})

    def admin_update_product_status(self, data):
        self.require_user("admin")
        with connect() as con:
            con.execute("UPDATE products SET moderation_status = ? WHERE id = ?", (data.get("moderation_status", "approved"), int(data["product_id"])))
        send_json(self, 200, {"ok": True})

    def admin_update_return_status(self, data):
        self.require_user("admin")
        with connect() as con:
            con.execute(
                "UPDATE returns SET status = ?, dispute_status = ?, seller_response = ? WHERE id = ?",
                (data.get("status", "requested"), data.get("dispute_status", "open"), data.get("seller_response", ""), int(data["return_id"])),
            )
        send_json(self, 200, {"ok": True})


def shipping_fee(method, weight):
    fees = {"In-Store Pickup": 0, "Standard Rider": 4.9, "Express Rider": 8.9, "Bulky Item": 12.9, "Seller Own Fleet": 6.9}
    return fees.get(method, 4.9) + max(float(weight) - 1, 0) * 1.5


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"PasarMalam API running on http://localhost:{PORT}")
    server.serve_forever()
