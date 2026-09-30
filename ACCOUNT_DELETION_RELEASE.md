# Account deletion and payment verification release

Prepared 30 September 2026. Deployment must be confirmed separately.

## Deletion

The public /delete-account.html form verifies a session or registered email and
password, creates one durable request and shows the agreed 30-day deadline.
Pending/suspended sellers may request deletion without contacting support.

Admin > Tickets > Account deletion requests provides data review and local
erasure. Unresolved orders, disputes, payments and payouts block erasure, not
submission of a request. The operator verifies legacy records before selecting
them; matching display names are not sufficient proof of ownership.

Local erasure removes credentials/profile, branches, eligible listings, cart,
wishlist, owned messages/reviews, support data and stored document references.
Historical transactions are redacted without pretending they were refunded.
Selected legally required identity/invoice fields require a reason and expiry.
The worker clears retained identity after expiry. Deleted-order tombstones
prevent later payment callbacks from restoring deleted information.

After local erasure, the request remains in external_cleanup. The inventory
identifies provider/upload URLs and checks for Cloudinary, AI, email, couriers,
payment providers, logs and backups. These are manual operator obligations,
not claims of automatic remote deletion. Check shared assets before deletion.
Review unlinked legacy content and backup restoration procedures.

Completion requires associated-data removal, lawful retention review and the
completion email. It is blocked while the account still exists. The system
does not automatically send that email. The request email and cleanup inventory
are cleared when completion is recorded.

## Operator procedure

1. Review the request, deadline and buyer/seller records.
2. Resolve pending obligations and verify legacy record ownership.
3. Record minimum lawful retention, reason and expiry. Confirm statutory periods
   with the accountant; do not retain a whole profile by default.
4. Type the account email, confirm irreversible local erasure, and execute it.
5. Complete provider/upload/log/backup cleanup and document exceptions.
6. Email completion and retained-information details, then complete the queue record.

Do not use the older Admin > Users delete action as this fulfilment workflow.
Do not erase a production customer's account merely to test the implementation.

## Payment security

Billplz callbacks and returns retrieve the stored bill from Billplz and validate
ID, collection, amount and paid amount. Configured signatures are mandatory.
Payment status requires the order owner or admin. Repeated callbacks cannot
reopen terminal orders or replenish erased data. Unused legacy ToyyibPay endpoints
return 503 to prevent bypassing verification. Query parameters are not proof of payment.

## Release checks

- Run Python unittest discovery and the deletion/admin browser suites.
- Deploy backend/schema, landing-site-v2 and admin-app assets together.
- Verify public /privacy.html and /delete-account.html without login.
- Verify protected status routes reject anonymous access.
- Update Tiiny admin assets if that separate host remains in use.
- Confirm privacy declarations against actual provider/retention practices.
- Run Xcode, real iPhone features and approved payment tests.

Tests use temporary databases and mocked services. They do not prove live email
delivery, remote data deletion, iPhone behaviour, settlement or App Store approval.
No real payment or courier booking is authorised by this test plan.
