#!/bin/sh
# All the tests that don't need a browser.
set -e
cd "$(dirname "$0")/.."
node test/engine.test.js
node test/parse.test.js
node test/manifest.test.js
echo
echo "Browser-level checks: serve the repo and open extension/test/fixtures/*.html"
echo "  python3 -m http.server 8000"
