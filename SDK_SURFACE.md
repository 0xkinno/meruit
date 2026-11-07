# SDK_SURFACE.md

"Code written" means the code exists, typechecks and builds. "Run" means it has been exercised against the real service. Nothing here is claimed live until its Run column says so.

| Sponsor feature | Package and version | File:line | Code written | Run against the real service |
|---|---|---|---|---|
| x402 v2 `upto` server scheme | `@x402/svm` 2.30.0 `upto/server` | `lib/x402/server.ts:58` | yes | 402 challenge observed locally (amount 120000 for 720 s); no payment yet |
| x402 self-facilitator (`upto`) | `@x402/core` 2.30.0, `@x402/svm` `upto/facilitator` | `lib/x402/server.ts:44`, `:48` | yes | not yet (needs a funded fee payer) |
| Paid route with per-request ceiling and settlement override | `@x402/next` 2.30.0 `withX402`, `setSettlementOverrides` | `app/api/transcribe/route.ts:78`, `:54` | yes | 402 only |
| Browser `upto` client with wallet signer | `@x402/svm` `upto/client`, `@x402/fetch` | `lib/x402/client.ts:16` | yes | not yet |
| payment-channels `open`, `settle_and_seal`, `distribute` | program `CHNLx...` via the SDK | inside `@x402/svm` | via SDK | not yet |
| payment-channels `requestClose`, `seal`, `withdrawPayer` | vendored generated client (MIT, `lib/channels/generated/`) | `lib/channels/escape.ts:77`, `:80`, `:83` | yes | not yet (B2) |
| Channel discovery by payer from chain | vendored generated client | `lib/channels/discover.ts:11` | yes, layout offset unit-tested | not yet against a real channel |
| Salt grinding to bump 255 | program docs (CU note) | `lib/channels/salt.ts:27` | yes, unit-tested | CU numbers not yet measured (B9) |
| Rent cleanup and abandoned-channel sweep | `UptoSvmRentCleanupManager` | `app/api/cron/sweep/route.ts:30` | yes | not yet |
| Durable channel storage | `PaymentChannelStorage` interface | `lib/x402/redisChannelStorage.ts` | yes, unit-tested on an in-memory KV | not yet on Upstash |
| Aurora Intents Deposits (persistent address) | REST `intents-api.aurora.dev` | `lib/aurora/deposits.ts:13` | yes | not yet (no API key; persistent creation needs an approved organisation) |
| Single-use address fallback | Aurora Swap API quote | `lib/aurora/deposits.ts:27` | yes | not yet |
| Aurora Swap API quote, submit, status (exit) | REST `/api/quote`, `/api/deposit/submit`, `/api/status` | `lib/aurora/swap.ts:36`, `:55` | yes, body shape unit-tested | not yet |
| Confidential Intents | quote `confidentiality` field | `lib/aurora/swap.ts:36` | yes, toggle hidden unless `NEXT_PUBLIC_CONFIDENTIAL=on` | not yet |
| Intents Connect (SDK recipe and Tron steps-only) | `@aurora-is-near/intents-connect` 7.29.0 installed | `app/api/aurora/connect/[[...path]]/route.ts` (proxy only) | proxy only | no access, so designed, not live |
| `batch-settlement` | `@x402/svm` | n/a | not used | not used, so not claimed |
