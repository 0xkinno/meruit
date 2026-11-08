# ENV_SETUP.md

Where every key goes. Rule: **a key never goes in a tracked file.** `.env.example` is tracked and public, so it must stay blank. Real values live in `.env.local` (git-ignored) on your machine and in Vercel's environment variables for the deployment.

## 1. Local: `.env.local`
```bash
npm install
npm run keys        # creates .env.local from .env.example with fresh wallets; prints public keys only
```
Then open `.env.local` and set these by hand:

| Variable | Value |
|---|---|
| `SOLANA_RPC_MAINNET` | the full URL `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY` (a bare key does not work) |
| `SOLANA_RPC_DEVNET` | `https://devnet.helius-rpc.com/?api-key=YOUR_KEY` |
| `GROQ_API_KEY` | from console.groq.com |
| `AURORA_API_KEY` | from studio.aurora.dev |
| `MERUIT_PAY_TO` | your Phantom address (payouts go here) |

Check: `npm run probe` prints which of them work (it never prints a key).

## 2. Vercel
Project `meruit`, team `kinnoskis-projects`. Set in Project, Settings, Environment Variables, for Production and Preview. Mark the secret ones Sensitive.

| Variable | Secret |
|---|---|
| `MERUIT_FEE_PAYER_KEY`, `MERUIT_RECEIVER_AUTHORIZER_KEY`, `MERUIT_SIGNING_SECRET`, `CRON_SECRET` | yes |
| `SOLANA_RPC_MAINNET`, `SOLANA_RPC_DEVNET`, `GROQ_API_KEY`, `AURORA_API_KEY` | yes |
| `MERUIT_PAY_TO` | no |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | yes, added by connecting Upstash Redis under Storage |
| `BLOB_READ_WRITE_TOKEN` | already set by the Blob store `meruit-audio` |
| `MERUIT_LIVE` | `on` to accept jobs, `off` to refuse them |

Or from a terminal with the Vercel CLI, which reads `.env.local` and sends values straight to Vercel without printing them:
```bash
vercel login
vercel link --project meruit
bash scripts/vercel-env.sh
```
`NEXT_PUBLIC_*` values are read at build time, so redeploy after changing them.

## 3. GitHub Actions
Repository, Settings, Secrets and variables, Actions: add `CRON_SECRET` with the same value as on Vercel. The sweeper workflow sends it as the bearer token.

## If a key was committed
Anything that was ever in a public commit must be treated as exposed, even after the file is cleaned. Rotate it at the provider (Groq, Aurora, Helius) and put the new value in `.env.local` and Vercel only.
