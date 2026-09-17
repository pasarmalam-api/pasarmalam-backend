# PM Express

- Pasar Malam riders fulfill these orders. Assignment is manual; admin receives a notification.
- Lalamove cities and immediate quotations are pricing references only. No driver is booked.
- The quoted delivery price includes the existing RM0.40 logistics admin fee.
- Pay on Arrival is accepted only with PM Express. Billplz remains available for prepayment.
- Cash orders remain unpaid with pending escrow while sellers prepare, ship and deliver them.
- Admin confirms collected cash through payment review. This preserves delivery progress and deducts stock once.
- Unpaid, non-cancelled cash orders reserve available stock during checkout validation.
- Completion is blocked until payment is confirmed. Cancellation releases the logical stock reservation.
- There is no rider application, automated dispatch, cash remittance integration or live courier tracking in this release.

Deploy the backend before publishing the buyer and seller static sites. Test with disposable records only.

Verification: `python -m unittest test_delivery test_admin_backend test_seller_operations test_shop_availability test_lalamove`, `node test_delivery_ui.cjs`, `node test_pm_express_ui.cjs`.
