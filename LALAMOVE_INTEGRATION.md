# Lalamove integration status

## Implemented

- Server-only Malaysia v3 client in `lalamove.py`, using the official HMAC signature,
  fixed production/sandbox hosts, request IDs, timeouts and redirect protection.
- Admin-only `GET /api/admin/lalamove/cities` checks credentials and returns available
  cities, vehicles, capacities and special requests.
- Admin-only `POST /api/admin/lalamove/quotation` obtains a diagnostic quotation.
  Required fields: `city` (locode), `service_type` (returned service key), `mode`
  (`express` or `standard`), `pickup` and `dropoff` (each with `address` and
  `coordinates: {lat, lng}`). Standard requires timezone-aware `schedule_at`.
- Express means immediate pickup, not a paid priority tip. Standard means scheduled
  pickup, not a guaranteed discount. Pooling is deliberately not enabled.
- Client errors never echo credentials, provider response bodies or submitted addresses.
- Booking requests are prohibited by the client's request allowlist.

## Configuration

Set `LALAMOVE_API_KEY`, `LALAMOVE_API_SECRET` and `LALAMOVE_ENV` (`production` or
`sandbox`) on the backend only. Credentials were saved through Render's environment
settings using Save only; they become active on the next deployment. No credentials
belong in source control, Tiiny archives, browser storage or this document.

## Buyer checkout release

The new checkout requests live prices and stores single-use quotes server-side. Each
quote is tied to its buyer, seller, product, quantity, variant, product price/weight,
route, vehicle and schedule. All payment paths ignore client prices. Self-pickup is
free and cash orders cannot mark themselves paid. Legacy non-quoted delivery methods
are rejected. Roll out the matching frontend and backend together.

Seller Store Profile links to Pickup Location. Sellers must save a confirmed pickup
address and coordinates. Buyers can use browser geolocation or manually supply the
coordinates of their delivery address, then confirm the match. Package weight is
validated against the API vehicle limit; dimensions require buyer confirmation.

Couriers are NOT booked automatically. The admin order view shows pickup, delivery,
contacts and the accepted delivery charge. An admin must verify payment, arrange the
delivery manually, and record its tracking number. Refresh the provider quote when
booking; any changed fare must not be silently charged to the buyer. No shipment is
marked booked merely because checkout has a quotation.

Before buyer rollout:

1. Configure real seller pickup locations and verify route accuracy with each seller.
2. Nearest-seller sorting and automated address geocoding remain pending.
3. Add seller package dimensions for automatic dimensional capacity checks.
4. Implement idempotent dispatch after verified payment, tracking/webhooks and recovery
   for expired quotations or price changes. Never silently charge a changed fare.
5. Confirm Pooling API support with Lalamove before enabling it only for explicitly
   non-perishable shipments. Do not infer API availability from the consumer app.

No real booking, top-up, product edit or buyer transaction is needed for these tests.

Official reference: https://developers.lalamove.com/

## Tests

`python -m unittest test_delivery test_lalamove test_seller_operations test_admin_backend test_seller_registration`

`node test_delivery_ui.cjs` covers mobile/desktop checkout, quote failures and changed
routes, zero-cost pickup and saving seller locations, with mocked APIs.

Lalamove responses are mocked in automated tests; passing them does not establish
production authentication, coverage, live rates or delivery performance.
