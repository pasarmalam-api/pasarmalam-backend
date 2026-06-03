# PasarMalam Real App Foundation

This folder is the first backend-ready version of PasarMalam.

The current TiinyHost buyer and seller pages are static demos. A real app needs this backend layer for saved products, buyer-seller messages, reviews, orders, and checkout status.

## What This Includes

- Products API
- Seller product creation
- Buyer-seller messages API
- Customer reviews API
- Orders API
- SQLite database
- Seed data for phones, chargers, electronics, car parts, shoes, clothes, food, and drinks
- No external Python packages required

## Run Locally

Install Python 3.11+ first, then run:

```bash
python server.py
```

Open:

```text
http://localhost:8080/api/health
http://localhost:8080/api/products
```

## Main API Routes

```text
GET  /api/products
POST /api/products
GET  /api/messages
POST /api/messages
GET  /api/reviews
POST /api/reviews
GET  /api/orders
POST /api/orders
POST /api/checkout
```

## Next Step

Connect the buyer and seller HTML pages to these APIs, then deploy the backend to a real backend host. TiinyHost can only host static files, so it cannot run this server.

## Render Deploy Settings

Use these settings if Render asks:

```text
Runtime: Python
Build Command: leave empty
Start Command: python server.py
```

The app already reads Render's `PORT` environment variable.
