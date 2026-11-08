# ENV_SETUP.md

Where every key goes. Rule: **a key never goes in a tracked file.** `.env.example` is tracked and public and stays blank. Real values live in `.env.local` (git-ignored) and in Vercel's environment variables.

## A. The wallet keys you need for Vercel
The two keys the server signs with were generated in the cloud session. They are in two files you can open in the Claude app's file viewer (they are inside the project folder and are git-ignored):

| Vercel variable | Open this file, copy the value of `secret` |
|---|---|
| `MERUIT_FEE_PAYER_KEY` | `.secrets/fee-payer.json` |
| `MERUIT_RECEIVER_AUTHORIZER_KEY` | `.secrets/receiver-authorizer.json` |

`MERUIT_SIGNING_SECRET` is not needed in production (it only signs break-test headers on previews); skip it.
`MERUIT_PAY_TO` is the public address where seller payouts go. Use your own Phantom address. Until you do, it is the placeholder test wallet `EMFSv59hiGMNMdjq41cM3YtWBkmPmyp9h3WTCJUHNerM`.

## B. Vercel environment variables
Vercel, project `meruit`, Settings, Environment Variables. Add each for **Production and Preview**. Tick **Sensitive** for the secret ones.

| Variable | Value | Sensitive |
|---|---|---|
| `MERUIT_FEE_PAYER_KEY` | from section A | yes |
| `MERUIT_RECEIVER_AUTHORIZER_KEY` | from section A | yes |
| `MERUIT_PAY_TO` | your Phantom address | no |
| `SOLANA_RPC_MAINNET` | `https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY` (the full URL, not the bare key) | yes |
| `SOLANA_RPC_DEVNET` | `https://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY` | yes |
| `GROQ_API_KEY` | the new Groq key | yes |
| `AURORA_API_KEY` | your Aurora key | yes |
| `CRON_SECRET` | see section D | yes |
| `MERUIT_LIVE` | `off` now; change to `on` when you want jobs accepted | no |

Already set for you: `NEXT_PUBLIC_NETWORK`, `NEXT_PUBLIC_SITE_URL`, the limits, `AURORA_BASE_URL`, and `BLOB_READ_WRITE_TOKEN` (from the Blob store `meruit-audio`).

After adding or changing variables: Deployments, the latest one, the three dots, **Redeploy**. (`NEXT_PUBLIC_*` values are baked in at build time, so they need a redeploy too.)

## C. Upstash Redis, step by step
1. Vercel dashboard, open the project **meruit**, click the **Storage** tab.
2. Click **Create Database** (or **Connect Store**), choose **Upstash**, then **Upstash for Redis**.
3. Name it `meruit-redis`, choose the **Free** plan, primary region **Washington, D.C. (iad1)** to sit next to the functions, click **Create**.
4. When asked which projects and environments to connect: select **meruit**, tick **Production** and **Preview**, and leave the variable prefix as the default. Click **Connect**.
5. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` (and a few others) to the project by itself. Meruit reads exactly those two (it also accepts `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`).
6. **Redeploy** the project.
7. Check: open `https://meruit-delta.vercel.app/status`. The row `redis` should say `ok` and the line above the table should say `Store: upstash`.

## D. CRON_SECRET, step by step
This is a password that only the GitHub schedule and the Vercel route share, so nobody else can trigger the sweeper.
1. Make a random value. On any computer with a terminal: `openssl rand -hex 32`. Without a terminal, open your browser's developer console and run `crypto.randomUUID()+crypto.randomUUID()` and use the result. Copy it.
2. Vercel, project `meruit`, Settings, Environment Variables: add `CRON_SECRET` with that value, Production and Preview, Sensitive. Redeploy.
3. GitHub, repository `0xkinno/meruit`, Settings, Secrets and variables, Actions, **New repository secret**: name `CRON_SECRET`, same value. Save.
4. Test it: GitHub, Actions tab, **Sweep abandoned channels**, **Run workflow**. It should finish green. The `/status` row `sweeper_last_run` then shows a recent time.

## E. Local `.env.local`
Run `npm run keys` once to create `.env.local` with fresh wallets. Then set `SOLANA_RPC_MAINNET`, `SOLANA_RPC_DEVNET`, `GROQ_API_KEY`, `AURORA_API_KEY`, `MERUIT_PAY_TO` by hand. `npm run probe` tells you which ones work without printing them.

## If a key was ever committed
Treat it as exposed even after the file is cleaned. Rotate it at the provider and put the new value in `.env.local` and Vercel only.
