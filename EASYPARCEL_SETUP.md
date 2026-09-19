# EasyParcel authorization

Official OAuth reference: https://easyparcel.github.io/OpenAPI/

Render configuration:
- EASYPARCEL_CLIENT_ID
- EASYPARCEL_CLIENT_SECRET
- PUBLIC_BASE_URL must be the HTTPS backend origin.

Registered redirect:
https://pasarmalam-backend.onrender.com/api/integrations/easyparcel/callback

Deploy the backend and publish the updated admin-app before connecting.
In Admin Settings, select Connect EasyParcel. Choose a Demo account in
EasyParcel and review its consent screen. Sandbox/live selection is made
by EasyParcel account selection, not a different OAuth endpoint.

Authorization stores encrypted tokens in easyparcel_connection.
The encryption key is derived from the client credentials; rotating them
requires reconnecting. Never export tokens to the browser or logs.
The admin status endpoint exposes no credentials.

The flow uses an admin-issued single-use ticket, a secure HttpOnly browser
cookie, ten-minute state expiry, and atomic replay protection.

This release only connects the account. It does not identify the account
as Demo/live, request courier quotes, book shipments, pay orders, or
automatically refresh expired tokens. Reconnect when the access token expires.
No shipment endpoint is enabled.

Validation:
- python -m unittest test_easyparcel_callback test_easyparcel_oauth
- node test_easyparcel_ui.cjs

Tests use temporary SQLite data and mocked provider responses. Live provider
authorization and PostgreSQL runtime verification remain deployment checks.
