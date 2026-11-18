#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
[[ "$(git branch --show-current)" == main ]] || { printf '%s\n' 'Not on main. Nothing staged.'; exit 1; }
git diff --cached --quiet || { printf '%s\n' 'Other changes are staged. Ask for a release review.'; exit 1; }
NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then NODE_BIN="${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe"; fi
[[ -x "$NODE_BIN" ]] || { printf '%s\n' 'Test runtime not found. Nothing staged.'; exit 1; }
for test in test_adaptive_marketplace.cjs test_home_ui.cjs test_responsive_chrome.cjs test_seller_registration_recovery.cjs test_seller_entry.cjs test_store_ui.cjs; do "$NODE_BIN" "$test"; done
git add -- landing-site-v2/buyer/home-ui.css landing-site-v2/buyer/index.html \
  landing-site-v2/workspace-ui.css landing-site-v2/seller/seller-session.js \
  landing-site-v2/seller/register.html test_adaptive_marketplace.cjs deploy-compact-type.sh
git diff --cached --check
git diff --cached --stat
git commit -m "Compact marketplace typography and enlarge PasarMalam logos"
git push origin main
