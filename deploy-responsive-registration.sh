#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ "$(git branch --show-current)" != main ]]; then
  printf '%s\n' 'Not on main. Nothing was staged.'
  exit 1
fi
if ! git diff --cached --quiet; then
  printf '%s\n' 'Other changes are staged. Nothing was changed; ask for a release review.'
  exit 1
fi
NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe"
fi
if [[ ! -x "$NODE_BIN" ]]; then
  printf '%s\n' 'The installed test runtime was not found. Nothing was staged.'
  exit 1
fi
"$NODE_BIN" test_adaptive_marketplace.cjs
"$NODE_BIN" test_home_ui.cjs
"$NODE_BIN" test_responsive_chrome.cjs
"$NODE_BIN" test_seller_registration_recovery.cjs
"$NODE_BIN" test_seller_entry.cjs
"$NODE_BIN" test_store_ui.cjs
git add -- landing-site-v2/buyer/index.html landing-site-v2/buyer/home-ui.css \
  landing-site-v2/buyer/become-seller.html landing-site-v2/buyer/become-seller.js \
  landing-site-v2/seller/register.html landing-site-v2/seller/seller-session.js \
  landing-site-v2/seller/shop-category.js landing-site-v2/seller-entry-language.js \
  landing-site-v2/workspace-ui.css test_seller_entry.cjs \
  test_seller_registration_recovery.cjs test_adaptive_marketplace.cjs \
  RESPONSIVE_CHECK_20261118.txt deploy-responsive-registration.sh
git diff --cached --check
git diff --cached --stat
git commit -m "Fit marketplace screens and improve seller registration recovery"
git push origin main
