#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! git diff --cached --quiet; then
  printf '%s\n' 'Other changes are already staged. Nothing was changed; please ask for a release review.'
  exit 1
fi
"/c/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe" package_android_host.py --cache-patch
git apply --cached compact-seller-cache.patch
git add -- landing-site-v2/buyer/index.html landing-site-v2/buyer/buyer-ui.js landing-site-v2/seller/seller-session.js landing-site-v2/workspace-ui.css test_account_actions.cjs test_responsive_chrome.cjs package_android_host.py deploy-compact-layout.sh
git commit -m "Compact buyer and seller phone layouts below the brand"
git push origin main
