# Shared-stock store branches

- One product row owns stock, name, images and base price. Branches do not copy products or stock.
- Seller Settings > Branches adds or edits named pickup points and optional per-product RM price overrides. Empty overrides inherit the current base price.
- The existing main store retains its pickup and base prices. New products automatically appear in every branch using their base price.
- Branches can be closed or hidden. The existing overall shop closed switch closes all branches.
- Checkout presents the branch and price before payment. Server ownership, availability, current-price and quotation-context checks are authoritative.
- Changing a branch, its price or pickup invalidates outstanding delivery quotes. Existing orders retain a branch/address/price snapshot.
- PM Express remains own-rider delivery; no automatic Lalamove booking is added.
- Existing shared-product payment/stock rules are retained, including cross-branch reservation of unpaid PM Express arrival-payment orders.

## Deployment

Deploy backend before frontend. Tables are created by the existing startup migration (SQLite and PostgreSQL-compatible SQL).

For Tiiny buyer/seller ZIPs include `landing-site-v2/branch-order.js` alongside the selected app files and `pm-notify.js` at archive root.

Seller Google search needs the existing browser key to allow the actual seller origin. The main domain is already allowed; add `https://violet-crissie-18.tiiny.site/*` in Google Cloud before testing the separate Tiiny seller. Do not broaden the key to unrestricted origins. Manual confirmed coordinates remain available when Google fails.

## Checks

`python -m unittest test_branches test_delivery`

`node test_branches_ui.cjs` and `node test_delivery_ui.cjs` use mocked external services and real browser controls at mobile/desktop sizes. Live production branch records and payments are not created by these tests.

This release selects branches at checkout. It does not add branch employee accounts, separate inventory, automatic nearest-branch selection or new driver dispatch.
