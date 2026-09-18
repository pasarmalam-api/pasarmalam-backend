# Account deletion request page

Public URL after deployment: https://www.pasarmalamapp.com/delete-account.html

Owner approved: complete account and associated personal-data deletion within 30 days after ownership verification, with an exception for legally required records. Necessary financial records use the applicable statutory seven-year period; the accountant must confirm the period's start and any other obligations.

## Manual fulfilment

Requests go to pasahmallam@gmail.com. Monitor that inbox, verify ownership, record the verification date and 30-day deadline, fulfil the request and email confirmation. Never ask for passwords or OTPs. Review linked orders, payouts, uploads, backups and service-provider copies. Record and explain any legally retained data and its expiry; do not retain the whole profile simply because financial history exists.

This release adds a request pathway, NOT an automatic deletion engine. Existing admin deletion blocks accounts with listings/transactions; it is not sufficient for all cases. Those cases need a scoped deletion/anonymisation review and must not be treated as completed merely by suspending the account.

## Release checks

- Run node test_deletion_page.cjs.
- Deploy landing-site-v2 to Render and verify the public URL returns HTTP 200 without login.
- Update buyer/seller Tiiny packages for the new account-page links; links deliberately target the main domain.
- Test an actual support-email delivery without sending a real deletion request.
- Verify the installed Android app exposes Buyer Profile or Seller Settings and can open the public link. If bundled pages or WebView navigation prevent this, update the Android build.
- In Play Console, set the Data safety account-deletion URL to the public URL above, review declarations for accuracy, and submit the changes for review. Do not claim Google approval before their review.
