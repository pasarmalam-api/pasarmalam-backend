#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! git diff --cached --quiet; then
  printf '%s\n' 'Other changes are staged. Nothing was changed; ask for a release review.'
  exit 1
fi
git add -- landing-site-v2/buyer/index.html landing-site-v2/buyer/buyer-ui.js landing-site-v2/workspace-ui.css test_responsive_chrome.cjs deploy-compact-banner.sh
git commit -m "Reduce phone banner and show product prices beneath names"
git push origin main
