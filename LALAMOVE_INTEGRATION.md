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

## Not yet enabled

This is a diagnostic foundation, not a completed checkout integration. The existing
buyer checkout still uses legacy fixed prices; those are NOT live Lalamove quotations.
Do not advertise live Lalamove pricing or automatic dispatch yet.

Before buyer rollout:

1. Verify authenticated city information and diagnostic quotes after deployment.
2. Capture seller pickup coordinates and buyer delivery coordinates with consent;
   confirm they match the entered addresses. Nearest-seller sorting is still pending.
3. Validate package weight/dimensions against vehicle capacity.
4. Persist quotations server-side and bind them to buyer, seller, product, quantity,
   address, coordinates, service and schedule. Checkout must reject expired/mismatched
   quotes and ignore client-supplied delivery prices in ALL payment paths.
5. Add buyer selection, schedule controls and quotation refresh; test browser flows.
6. Implement idempotent dispatch after verified payment, tracking/webhooks and recovery
   for expired quotations or price changes. Never silently charge a changed fare.
7. Confirm Pooling API support with Lalamove before enabling it only for explicitly
   non-perishable shipments. Do not infer API availability from the consumer app.

No real booking, top-up, product edit or buyer transaction is needed for these tests.

Official reference: https://developers.lalamove.com/

## Tests

`python -m unittest test_lalamove test_seller_operations test_admin_backend test_seller_registration`

Lalamove responses are mocked in automated tests; passing them does not establish
production authentication, coverage, live rates or delivery performance.
