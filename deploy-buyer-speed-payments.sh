#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! git diff --cached --quiet; then
  printf '%s\n' 'Other changes are staged. Nothing was changed; ask for a release review.'
  exit 1
fi
"/c/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe" prepare_buyer_payment_release.py
git apply --cached buyer-payment-backend.patch
git add -- landing-site-v2/buyer/index.html landing-site-v2/buyer/badges.js landing-site-v2/buyer/checkout.html landing-site-v2/buyer/checkout-payment-methods.js test_buyer_performance.cjs test_checkout_payment_methods.cjs test_billplz_verification.py test_billplz_card_profile.py package_android_host.py prepare_buyer_payment_release.py deploy-buyer-speed-payments.sh BILLPLZ_CARD_ACCOUNT_SETUP.txt
git commit -m "Speed up buyer home and support the card-enabled payment account"
git push origin main
