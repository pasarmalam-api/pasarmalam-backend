from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
import json
import os
import sqlite3
import time

DB_PATH = os.environ.get("PASARMALAM_DB", "pasarmalam.sqlite3")
PORT = int(os.environ.get("PORT", "8080"))


def connect():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db():
    with connect() as con:
        con.executescript(
            """
            CREATE TABLE IF NOT EXISTS products (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              shop TEXT NOT NULL,
              category TEXT NOT NULL,
              price REAL NOT NULL,
              stock INTEGER NOT NULL DEFAULT 0,
              condition TEXT NOT NULL CHECK(condition IN ('New','Used')),
              price_mode TEXT NOT NULL CHECK(price_mode IN ('Fixed','Negotiable')),
              description TEXT DEFAULT '',
              image_url TEXT DEFAULT '',
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
              buyer_name TEXT NOT NULL,
              rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
              title TEXT NOT NULL,
              body TEXT NOT NULL,
              seller_reply TEXT DEFAULT '',
              created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS orders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              buyer_name TEXT NOT NULL,
              product_id INTEGER NOT NULL,
              quantity INTEGER NOT NULL DEFAULT 1,
              total REAL NOT NULL,
              logistics_method TEXT NOT NULL,
              logistics_fee REAL NOT NULL,
              payment_status TEXT NOT NULL DEFAULT 'pending',
              order_status TEXT NOT NULL DEFAULT 'to_pack',
              created_at INTEGER NOT NULL
            );
            """
        )
        product_columns = [row["name"] for row in con.execute("PRAGMA table_info(products)")]
        if "image_url" not in product_columns:
            con.execute("ALTER TABLE products ADD COLUMN image_url TEXT DEFAULT ''")
        count = con.execute("SELECT COUNT(*) AS c FROM products").fetchone()["c"]
        if count == 0:
            seed_products(con)


def seed_products(con):
    now = int(time.time())
    rows = [
        ("Used iPhone 12 128GB", "Mobile Malam", "Phones", 899.00, 3, "Used", "Negotiable", "Verified used phone", ""),
        ("USB-C fast charger 30W", "Gerai Gadget", "Chargers", 29.90, 20, "New", "Negotiable", "Fast charging adapter", ""),
        ("Bluetooth speaker mini", "Tech Lane", "Electronics", 45.00, 16, "New", "Fixed", "Portable speaker", ""),
        ("Used Myvi headlamp", "Auto Parts Corner", "Car Parts", 120.00, 2, "Used", "Negotiable", "Left side headlamp", ""),
        ("Running shoes size 42", "Lorong Bundle", "Shoes", 55.00, 6, "Used", "Negotiable", "Clean used shoes", ""),
        ("Cotton baju kurung set", "Cantik Craft", "Clothes", 38.00, 18, "New", "Fixed", "Local clothing", ""),
        ("Satay ayam set", "Abang Din Satay", "Food", 12.90, 48, "New", "Fixed", "Fresh pasar malam food", ""),
        ("Air balang mango float", "Balang Boss", "Drinks", 6.50, 35, "New", "Fixed", "Cold drink", ""),
    ]
    con.executemany(
        """
        INSERT INTO products
        (name, shop, category, price, stock, condition, price_mode, description, image_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [(*row, now) for row in rows],
    )
    con.executemany(
        """
        INSERT INTO reviews
        (product_id, buyer_name, rating, title, body, seller_reply, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (1, "Aina", 5, "Fast reply", "Item condition matched the listing.", "Thank you.", now),
            (2, "Jason", 4, "Good charger", "Works well and fair price.", "", now),
        ],
    )


def row_to_dict(row):
    return {key: row[key] for key in row.keys()}


def read_json(handler):
    length = int(handler.headers.get("Content-Length", "0") or "0")
    if length > 2_000_000:
        raise ValueError("Request body too large")
    if length == 0:
        return {}
    raw = handler.rfile.read(length).decode("utf-8")
    return json.loads(raw)


def send_json(handler, status, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        send_json(self, 204, {})

    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        try:
            if parsed.path == "/api/health":
                send_json(self, 200, {"ok": True, "service": "PasarMalam API"})
            elif parsed.path == "/api/products":
                self.get_products(query)
            elif parsed.path == "/api/messages":
                self.get_messages(query)
            elif parsed.path == "/api/reviews":
                self.get_reviews(query)
            elif parsed.path == "/api/orders":
                self.get_orders(query)
            else:
                send_json(self, 404, {"error": "Not found"})
        except Exception as exc:
            send_json(self, 500, {"error": str(exc)})

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            data = read_json(self)
            if parsed.path == "/api/products":
                self.create_product(data)
            elif parsed.path == "/api/messages":
                self.create_message(data)
            elif parsed.path == "/api/reviews":
                self.create_review(data)
            elif parsed.path == "/api/orders":
                self.create_order(data)
            elif parsed.path == "/api/checkout":
                self.checkout(data)
            else:
                send_json(self, 404, {"error": "Not found"})
        except Exception as exc:
            send_json(self, 400, {"error": str(exc)})

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
        send_json(self, 200, {"products": rows})

    def create_product(self, data):
        required = ["name", "shop", "category", "price", "stock", "condition", "price_mode"]
        for key in required:
            if key not in data:
                raise ValueError(f"Missing {key}")
        with connect() as con:
            cur = con.execute(
                """
                INSERT INTO products
                (name, shop, category, price, stock, condition, price_mode, description, image_url, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data["name"],
                    data["shop"],
                    data["category"],
                    float(data["price"]),
                    int(data["stock"]),
                    data["condition"],
                    data["price_mode"],
                    data.get("description", ""),
                    data.get("image_url", ""),
                    int(time.time()),
                ),
            )
        send_json(self, 201, {"id": cur.lastrowid})

    def get_messages(self, query):
        product_id = query.get("product_id", [""])[0]
        sql = "SELECT * FROM messages"
        params = []
        if product_id:
            sql += " WHERE product_id = ?"
            params.append(product_id)
        sql += " ORDER BY created_at ASC, id ASC"
        with connect() as con:
            rows = [row_to_dict(row) for row in con.execute(sql, params)]
        send_json(self, 200, {"messages": rows})

    def create_message(self, data):
        with connect() as con:
            cur = con.execute(
                """
                INSERT INTO messages
                (product_id, buyer_name, seller_name, sender_role, body, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    data.get("product_id"),
                    data.get("buyer_name", "Buyer"),
                    data.get("seller_name", "PasarMalam Seller"),
                    data["sender_role"],
                    data["body"],
                    int(time.time()),
                ),
            )
        send_json(self, 201, {"id": cur.lastrowid})

    def get_reviews(self, query):
        product_id = query.get("product_id", [""])[0]
        sql = "SELECT * FROM reviews"
        params = []
        if product_id:
            sql += " WHERE product_id = ?"
            params.append(product_id)
        sql += " ORDER BY created_at DESC, id DESC"
        with connect() as con:
            rows = [row_to_dict(row) for row in con.execute(sql, params)]
        send_json(self, 200, {"reviews": rows})

    def create_review(self, data):
        with connect() as con:
            cur = con.execute(
                """
                INSERT INTO reviews
                (product_id, buyer_name, rating, title, body, seller_reply, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data.get("product_id"),
                    data.get("buyer_name", "Buyer"),
                    int(data["rating"]),
                    data["title"],
                    data["body"],
                    data.get("seller_reply", ""),
                    int(time.time()),
                ),
            )
        send_json(self, 201, {"id": cur.lastrowid})

    def get_orders(self, query):
        with connect() as con:
            rows = [row_to_dict(row) for row in con.execute("SELECT * FROM orders ORDER BY created_at DESC, id DESC")]
        send_json(self, 200, {"orders": rows})

    def create_order(self, data):
        with connect() as con:
            cur = con.execute(
                """
                INSERT INTO orders
                (buyer_name, product_id, quantity, total, logistics_method, logistics_fee, payment_status, order_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data.get("buyer_name", "Buyer"),
                    int(data["product_id"]),
                    int(data.get("quantity", 1)),
                    float(data["total"]),
                    data.get("logistics_method", "pickup"),
                    float(data.get("logistics_fee", 0)),
                    data.get("payment_status", "pending"),
                    data.get("order_status", "to_pack"),
                    int(time.time()),
                ),
            )
        send_json(self, 201, {"id": cur.lastrowid})

    def checkout(self, data):
        data["payment_status"] = "pending"
        data["order_status"] = "to_pack"
        self.create_order(data)


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"PasarMalam API running on http://localhost:{PORT}")
    server.serve_forever()
