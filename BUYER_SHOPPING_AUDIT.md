# Buyer shopping audit - 21 September 2026

## Reference

Compared the existing buyer experience with Shopee's documented shopping sequence: product discovery, variation selection, cart, delivery/payment selection, and order history.
https://help.shopee.com.my/portal/4/article/78540

PasarMalam branding, full banner and existing seller/category catalogue are retained. This is not a claim of feature parity with Shopee.

## Implemented

- Shared Home, Categories, Chat, Orders and Me navigation on every buyer page; active location, mobile safe-area spacing and desktop navigation.
- Seller entry remains in the homepage header; cart access remains available.
- Search results support search text, category, price range and sorting. Filters survive reload via URL parameters; reset, empty and failed-load states are handled.
- Search cards use real links for keyboard access. Legacy Chargers category maps to Phone Accessories.
- Product photos can be selected from a thumbnail gallery. Removed fabricated default ratings, preferred-seller badges, blanket vouchers and default warranty claims.
- Products with variants open the product page before homepage add-to-cart.
- Cart identifies the exact selected item and subtotal. Quantity controls prevent stock-limit violations and overlapping requests.
- Checkout rejects ambiguous multi-item cart entry instead of silently charging for only its first item. Single-product checkout remains the backend's supported payment model.
- Orders have status tabs with real counts, details and receipts. Returns entry is offered for delivered/completed orders.
- Vouchers are read from active campaigns, not hard-coded Claim buttons. Removed unsupported coins and blanket free-shipping claims from cart.
- Checkout voucher preview restricts eligibility to the current seller.
- Server and checkout voucher parsing now separate the discount from minimum spend in legacy descriptions (for example RM5 above RM50), reject malformed/negative discounts, and cap discounts to the item subtotal.
- Profile details appear before the account-deletion section; deletion access remains available.

## Verification

- 27 buyer pages at 320, 360, 390, 768 and 1440 pixels: 135 layout checks passed.
- Focused final layout repeat on five changed pages at 320 and 1440 pixels: 10 checks passed.
- Existing buyer action suite: password reset request/confirmation/error states, login return, profile save/logout, product/cart/chat/support/wishlist/notification/order actions and home links.
- New shopping suite at 360 and 1440 pixels: filters/sort/reset/persistence, empty/API error states, selecting the second cart item, ambiguous checkout blocking, order tabs, live-campaign rendering, photo selection and shared navigation routes.
- Delivery UI regression suite: quote invalidation, failed/stale quotes, pickup and seller locations passed.
- PM Express fulfillment UI regression suite passed.
- Four isolated Python campaign-discount tests passed, including minimum spend, percent/amount caps, invalid values and seller scope.
- Visual screenshots inspected for mobile product/cart/checkout and desktop homepage. Desktop brand squeezing found during screenshot review was fixed and added to the layout assertions.

Tests use controlled fixtures and intercept external writes. No customer order, payment or courier booking was created.

## Not represented as complete

- Combined multi-item/multi-seller payment, per-seller delivery totals and partial refunds require a backend order-group design. Checkout currently makes one selected item explicit.
- Coins/reward accounting is not implemented.
- Photo-search currently uses category/keyword matching, not visual AI matching.
- Physical-phone camera/keyboard behavior, actual reset email receipt, production payment settlement and courier dispatch were not exercised by these browser tests.
- Changes are local until separately published to Render and Tiiny.
