# Seller audit - 16 September 2026

All 25 seller pages were opened locally and checked for the supplied logo, local navigation targets and desktop/mobile typography. Distinct visible local links were clicked.

## Fixed
- Missing logos on registration acknowledgement and product-published pages.
- Back controls and order/product query parameters lost through sign-in.
- Sample listing/campaign/logistics statistics and unsupported advertising/free-shipping campaign choices.
- Invented courier labels: now explicitly unavailable, never a false booking success.
- Fixed sample courier prices: now live-quote wording, including buyer shipping information.
- Campaign ownership and discount validation.
- Order chat selecting the wrong buyer conversation.
- Notification opening now marks that item read.
- Sellers could release escrow or reopen closed orders: completion requires platform approval; backward fulfillment transitions are blocked.
- Delivery deadlines no longer reset on repeated updates.
- Sales totals now exclude unpaid/cancelled orders.
- Non-AI fallback advice is labelled; product and metric loading errors are visible.

## Verification
- 94 Python tests passed using isolated databases and mocked external providers.
- Seller browser workflow tests cover product creation/editing, photos/removal, publish-next flow, delete confirmation/cancellation, campaigns, support, messages, review replies, return responses, profile/payout details, verification uploads, password change, order updates, notifications, AI routing, errors, navigation, search, refresh, menu and language controls.
- Dedicated category, shop availability, session, registration, delivery and logo suites passed.
- Command inventory: ../outputs/seller-audit/command-inventory.json.

## Limits
Browser mutations use mocked APIs; Python tests exercise backend handlers against test databases. No real seller data, passwords, money, email or courier bookings were changed.

Courier booking/labels remain unintegrated. Live email receipt, production upload-provider acceptance, physical camera capture and real-device location permissions are not certified. This audit does not prove every production state or external-service failure is covered.

Changes require deployment before customers receive them.
