# FRICTION_REPORT.md

Sponsor friction only. Kept out of headlines. Each entry is something that cost time, with what we did.

1. `@x402/next` 2.30.0 requires Next.js 16.4.1 or later. A plan written for Next 15 fails at `npm install` with a peer dependency error. We moved to Next 16.
2. The x402.org hosted facilitator advertises Solana `exact` only, so `upto` on Solana needs a self-hosted facilitator. The SDK makes that practical, but a first-time reader of the hosted docs would not know it.
3. Aurora persistent deposit addresses are limited to approved organisations (403 otherwise), while the docs overview presents them as available. We coded a single-use fallback.
4. The Aurora quote body requires `depositType`, which a summary of the endpoint may omit. Found by reading the OpenAPI block on the reference page.
5. The generated payment-channels client uses `.js` import suffixes and a kit 6 peer range, while `@x402/svm` 2.30.0 expects kit 8. We vendored the client and dropped the suffixes; the instruction builders worked unchanged with kit 8.
6. Solana devnet RPC airdrops are closed ("The RPC faucet is closed on this cluster"), so unattended devnet testing needs a funded key from the web faucet.
7. B7 (design rule): a channel `open` is valid only within 1,500 slots of its `open_slot`, so it must not be pre-signed inside a cross-chain execution. This is from the documentation; it is unmeasured until B7 runs.
8. Aurora persistent deposit addresses worked on our key for both Tron and EVM to Solana USDC, contrary to the docs warning that creation is limited to approved organisations. Worth confirming that this key's approval is intentional.
9. A Solana deposit address needs its USDC token account created by the sender, which costs about 0.002 SOL of rent, paid by whoever sends. A buyer holding only USDC cannot exit through the Swap API without a little SOL. Meruit's exit flow tells the buyer this up front.
10. Aurora quote validation rejects the burn address `0x...dead` as an EVM recipient ("recipient is not valid") and has a per-route minimum (Tron about 1.89 USDC at quote time, Base 0.5 USDC). Neither is in the quote reference page.
11. When a resource handler returns an error status, the x402 server refunds automatically by settling at zero. When the settlement override itself is refused (amount above the ceiling), nothing settles and nothing refunds: the deposit stays escrowed until the buyer's escape hatch or a sweeper closes it. We recovered such a channel on devnet. This is a sensible default but not obvious from the specification.
12. `@noble/hashes` 2.x and `@noble/curves` 2.x require `.js` subpaths in imports; older example code that imports `@noble/hashes/sha3` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
13. The plan and the Intents Connect pages say access comes through the Aurora team, but the Connect API answered without any key for the intermediary endpoint, and bridge-in worked with the same Aurora API key. A first-time reader would not try it.
14. `quote.recipient` is accepted only for out-operations; sending it on a bridge-in returns `400 quote.recipient is only valid when outOperation=true`. The schema page lists it without that condition.
15. The ERC-191 signature is not described on the REST pages. It is `personal_sign` over `details.payload.payload_json` verbatim, with the recovery byte 27/28 turned into 0/1, base58, and a `secp256k1:` prefix. We found it in the SDK source.
16. A created but unsigned execution blocks the wallet (`409 an execution for this wallet is already in progress`) until its quote deadline passes, and it does not appear in the executions list, so it cannot be found to delete. A failed first attempt cost about 25 minutes. Save the execution id the moment it is created.
17. The bridge fee from Base to Solana is large for small amounts (about 0.24 USDC at 0.5 USDC), and the first Connect run for a wallet adds a one-time token-account cost. The quote's `amountOut` is already net of the network fee.
18. On Vercel's Hobby plan cron jobs run at most once a day, so a 10 minute sweeper needs an outside scheduler such as GitHub Actions.
