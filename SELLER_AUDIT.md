# Seller Audit

## Verified locally

All 23 seller HTML pages were loaded with populated mocked responses. Navigation targets were checked separately, with desktop/mobile session and menu tests.

| Area | Coverage |
| --- | --- |
| Registration | Duplicate-submit guard, registration redirect, thank-you languages, backend OTP/registration/email-queue tests |
| Login/session | Auth headers, role guard, logout, expiration, duplicate login prompts, password navigation; suspended/deleted account tokens rejected |
| Products | Create, edit, delete/cancel, missing-ID protection, image upload/preview, numeric validation, own-shop filtering, cross-shop denial, order-history deletion protection |
| Orders | Populated tabs, quick shipping action, detail update, missing-ID protection, unpaid label lock |
| Logistics | Owned paid-order label generation; missing, foreign, unpaid orders rejected; rate display |
| Returns/reviews | Populated display, seller responses/replies; ownership checks and closed-return backend lock |
| Chat | Conversation selection and selected product/buyer payload, shop filtering, sender identity enforcement |
| Notifications | Mark read request, ownership restriction, badge refresh event |
| Store/settings | Profile update, payout profile validation/submission, password change |
| Business verification | Image resizing/upload/preview and submission payload |
| Support | Create/list; explicit failed request feedback |
| Campaigns | Create/list and input-field collision fix; own-shop filtering |
| AI | Prompt and request/response UI; browser-global collision fix |
| Wallet/performance | Page loading, scoped metrics, unavailable figures no longer invented; wallet access requires seller/admin |
| General | Double-click guard for mutating actions, visible unhandled-request error, escaped common rendered text, mobile menu hit-testing |

## Fixes found by the audit

- Browser globals `name`, `status`, and `prompt` broke forms and feedback.
- Seller data endpoints exposed unfiltered lists or accepted unauthenticated access.
- Chat replies targeted product 1 rather than the chosen buyer conversation.
- Existing tokens remained valid after account suspension/deletion.
- Missing order IDs could select a different order; product edits defaulted to ID 1.
- Closed returns accepted responses on the backend.
- Product deletion could break order history.
- Product preview tiles had no dimensions.
- Hard-coded campaign/logistics statistics were presented as real figures.
- Dashboard product titles were rewritten by old test-data cleanup code.

## Reproduce

- Bundled Python: `-m unittest test_seller_operations test_admin_backend test_seller_registration` (36 tests).
- `node test_seller_workflows.cjs`
- `node test_seller_session.cjs`
- `node test_seller_registration.cjs`

## Boundaries

No real seller records, orders, money, messages, or emails were changed by this audit. Browser writes use mocked responses; backend tests use temporary SQLite databases. Cloudinary, AI, and email-provider delivery are not live-provider certified. A generated AWB is the existing internal label, not proof of a courier booking. Native iOS/Android hardware, live payment settlement, and PostgreSQL concurrency remain separate verification tasks. This coverage does not prove the absence of every possible defect.
