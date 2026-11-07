#!/usr/bin/env bash
# Pushes the secret and key-bearing variables from .env.local to the Vercel project `meruit` (production + preview).
# Secrets are read locally and piped to the Vercel CLI; they never pass through any chat or log.
# Usage: vercel login && vercel link --project meruit && bash scripts/vercel-env.sh
# MERUIT_LIVE is not pushed: it stays "off" until you approve the first mainnet transaction.
set -euo pipefail

VARS=(
  MERUIT_FEE_PAYER_KEY MERUIT_RECEIVER_AUTHORIZER_KEY MERUIT_PAY_TO MERUIT_SIGNING_SECRET CRON_SECRET
  SOLANA_RPC_MAINNET SOLANA_RPC_DEVNET GROQ_API_KEY AURORA_API_KEY AURORA_CONNECT_BASE_URL ONECLICK_JWT
  KV_REST_API_URL KV_REST_API_TOKEN BLOB_READ_WRITE_TOKEN
)

get() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2- | sed 's/[[:space:]]\+#.*$//'; }

for name in "${VARS[@]}"; do
  value="$(get "$name")"
  if [ -z "$value" ]; then echo "skip  $name (empty in .env.local)"; continue; fi
  for target in production preview; do
    vercel env rm "$name" "$target" --yes >/dev/null 2>&1 || true
    printf '%s' "$value" | vercel env add "$name" "$target" --sensitive >/dev/null
  done
  echo "set   $name"
done
echo "Done. Deploy with: vercel --prod"
