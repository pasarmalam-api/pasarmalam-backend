# EasyParcel Checkout

Checkout now offers standard EasyParcel courier quotations, sorted by total price.
The buyer selects a courier; the server stores its service ID and quotation with
the order. Prices include the existing RM0.40 logistics administration fee.
Quotes expire after five minutes locally and are single-use and bound to buyer,
product, quantity, variant, branch, price, weight and addresses.

This release does NOT submit or pay for EasyParcel shipments or generate labels.
Paid orders require manual booking using the selected courier. No wallet debit
occurs when getting quotations. Pay on Arrival remains exclusive to PM Express.

Both saved seller pickup and buyer delivery addresses must include one five-digit
postcode and an unambiguous Malaysian state name. Missing/ambiguous addresses
fail closed. Standard courier is restricted to non-food shop categories; groceries
remain excluded until products have explicit perishable eligibility.

Quotes use saved product weight multiplied by quantity. Packaging dimensions are
not yet captured, so bulky parcels can incur volumetric adjustments at booking.
Confirm packed weights and final courier charges during manual fulfilment.
BYOC rates are excluded because separate carrier billing is not supported.

OAuth refresh runs before quoting and commits independently of checkout, with
sanitized errors. A revoked/expired refresh token requires Admin Settings reconnect.

Verification: Python pricing/route/payment/OAuth tests and mocked Edge checkout
tests on mobile and desktop. Live checkout rate retrieval needs deployment and
an authenticated buyer with a complete seller pickup address. No paid live test.

Android QR: assets/pasarmalam-download-qr.png, direct Google Play package URL.
Generated with qrcode, independently decoded with OpenCV. Play page returned 200.
