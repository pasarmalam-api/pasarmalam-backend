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
git add -- landing-site-v2/buyer/index.html landing-site-v2/buyer/badges.js \
  landing-site-v2/buyer/home-ui.css landing-site-v2/buyer/home-ui.js \
  landing-site-v2/buyer/icons test_home_ui.cjs test_buyer_performance.cjs \
  BUYER_HOME_CHECK_20261118.txt deploy-buyer-home.sh
git diff --cached --check
git diff --cached --stat
git commit -m "Redesign buyer home for compact mobile marketplace shopping"
git push origin main
