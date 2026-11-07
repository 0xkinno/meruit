# FRICTION_REPORT.md

Sponsor friction only. Kept out of headlines. Each entry is something that cost time, with what we did.

1. `@x402/next` 2.30.0 requires Next.js 16.4.1 or later. A plan written for Next 15 fails at `npm install` with a peer dependency error. We moved to Next 16.
2. The x402.org hosted facilitator advertises Solana `exact` only, so `upto` on Solana needs a self-hosted facilitator. The SDK makes that practical, but a first-time reader of the hosted docs would not know it.
3. Aurora persistent deposit addresses are limited to approved organisations (403 otherwise), while the docs overview presents them as available. We coded a single-use fallback.
4. The Aurora quote body requires `depositType`, which a summary of the endpoint may omit. Found by reading the OpenAPI block on the reference page.
5. The generated payment-channels client uses `.js` import suffixes and a kit 6 peer range, while `@x402/svm` 2.30.0 expects kit 8. We vendored the client and dropped the suffixes; the instruction builders worked unchanged with kit 8.
6. Solana devnet RPC airdrops are closed ("The RPC faucet is closed on this cluster"), so unattended devnet testing needs a funded key from the web faucet.
7. B7 (design rule): a channel `open` is valid only within 1,500 slots of its `open_slot`, so it must not be pre-signed inside a cross-chain execution. This is from the documentation; it is unmeasured until B7 runs.
