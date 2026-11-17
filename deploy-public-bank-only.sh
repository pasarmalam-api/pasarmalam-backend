#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! git diff --cached --quiet; then
  printf '%s\n' 'Other changes are staged. Nothing was changed; ask for a release review.'
  exit 1
fi
"/c/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe" prepare_buyer_payment_release.py
git apply --cached buyer-payment-backend.patch
git add -- test_billplz_card_profile.py prepare_buyer_payment_release.py BILLPLZ_CARD_ACCOUNT_SETUP.txt deploy-public-bank-only.sh
git commit -m "Retire Affin checkout fallback and preserve historical payment verification"
git push origin main
