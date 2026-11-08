#!/usr/bin/env bash
# Starts a local devnet server with the test wallet and inline audio, runs the paid-flow browser test, stops the server.
# The test wallet key is read from .secrets/buyer-test.json into the environment of the dev server only.
set -euo pipefail
cd "$(dirname "$0")/.."
SECRET="$(python3 -c "import json;print(json.load(open('.secrets/buyer-test.json'))['secret'])")"
pkill -f "next dev" 2>/dev/null || true
NEXT_PUBLIC_NETWORK=devnet NEXT_PUBLIC_E2E=1 NEXT_PUBLIC_E2E_SECRET="$SECRET" NEXT_PUBLIC_DEV_INLINE_AUDIO=1 \
MERUIT_STORE=memory MERUIT_DEV_AUDIO=1 MERUIT_LIVE=on npx next dev -p 3121 > /tmp/e2e-paid-server.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true; pkill -f "next dev" 2>/dev/null || true' EXIT
until curl -s -o /dev/null http://localhost:3121/studio; do sleep 2; done
npx playwright test tests/e2e/paid-flow.spec.ts --trace off --workers 1
