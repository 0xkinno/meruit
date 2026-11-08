# FINDINGS.md

Questions B1 to B10 were pre-registered in commit `a2a2575b0995c4e531a981daa6ca905f01099332` (2026-11-07), before any break run. Every result below is backed by a file in `runs/break/` or `runs/tx/`; misses and negative results are included. "Devnet" and "mainnet" are stated for every row. Signatures link on Solana Explorer.

| # | Question (pre-registered) | Network | Result | Evidence |
|---|---|---|---|---|
| B1 | With 3 of 12 chunks failing upstream, is the buyer charged for 9 minutes and refunded 3, on chain? | devnet and mainnet | Yes, both. Cap $0.12, charged $0.09, returned $0.03, failed parts 4, 7 and 10 | `B1-devnet.json`, `B1-mainnet.json`; settle `62QL9p9M...` (devnet), `hoTcdYTp...` (mainnet) |
| B2 | If the seller dies after open and never settles, can the buyer alone recover the full deposit? How long? | devnet and mainnet | Yes, both, zero loss. Devnet: 70 s with a 60 s delay. Mainnet: 915 s with the production 900 s delay | `B2-devnet.json`, `B2-mainnet.json` |
| B3 | Is a second settlement of the same job refused, and by what? | devnet | Yes. The same signed payment sent twice: first request paid 10,000 atomic and delivered; the replay, sent under a different job id so our own job guard could not be the cause, was refused by the x402 server with `invalid_upto_svm_channel_already_open` (HTTP 402) | `B3-devnet.json`; first settle `2zoW5BBFfQ...` |
| B4 | Does an `open` with open_slot 1,600 slots old fail with `2003 OpenSlotOutOfWindow`? | devnet | Yes, by simulation (nothing broadcast): `Custom 2003`, 719 compute units consumed | `B4-devnet.json` |
| B5 | When the server asks to settle above the deposit, who refuses, the SDK or the program? | devnet | **The SDK refuses** (`Settlement override amount "10001" ... exceeds the authorized maximum of 10000`); the program was never reached. The deposit stayed escrowed afterwards and was recovered by the buyer's escape hatch | `raw/job_26f7ff41...json`, `rescue-BUZChEA3.json` |
| B6 | What does a deposit below the minimum do, and how many minutes until the refund? | mainnet | `INCOMPLETE_DEPOSIT` at 1.3 min, `REFUNDED` at 8.0 min (reason `QUOTE_EXPIRED`). Sent 0.05 USDC, refunded 0.040023: the refund fee was about 20% of the amount | `B6-mainnet.json` |
| B7 | Distribution of minutes from send to arrival for Tron and Base deposits; fraction above 1,500 slots | none | **Not run.** It needs real USDT on Tron and USDC on Base, which were not available. The only Aurora timing so far is the opposite direction (see below) | none |
| B8 | Rent fronted per job and its return | mainnet | About 1.97M lamports (0.00197 SOL) per completed job, returned in full by one batched reclaim for two channels | `B8-mainnet.json` |
| B9 | Compute units with and without salt grinding | devnet | **Measured.** The same `open` instruction sent twice with only the salt changed: ground salt (bumps 255/255) **31,565 CU**; non-ground salt (bumps 253/248) **55,565 CU**. Difference 24,000 CU, against 13,500 predicted by the docs' cost model (about 2,670 CU per bump step, not 1,500). One pair of transactions, not a distribution. The SDK picks its own salt, so opens sent through the SDK are not ground (SDK `open` on devnet used 47,340 CU). Bump survey: devnet 22 of 26 SDK-opened channels not at 255 for both addresses | `B9-with-without-devnet.json`, `B9-devnet.json`, `B9-mainnet.json` |
| B10 | When the wallet rejects mid-flow, no channel opens and no charge | devnet | Yes, in a real browser: declining in the approval dialog, and the wallet rejecting the signature, each left no job, no captions and no charge, with a plain message | `tests/e2e/paid-flow.spec.ts` |

## Extra findings (not pre-registered)
- **A handler error refunds automatically.** When the paid route returned 503 after the open, the SDK settled at zero by itself and the buyer got everything back with no action (devnet, zero settlement `9f75e5x4sdMntARe7RcrCzcBWyAte4yftPZMSEpAFAJMDqv8A7KabeWS3TzVhZ49g7NSizHxUTn8f8Qno9HL4Ry`, record `runs/break/raw/job_ea63ad26ce3b47909499.json`). The buyer's own escape hatch is therefore for the case where the seller process dies, which is what B2 simulates by exiting the process.
- **A refused settlement override leaves the deposit escrowed** (see B5). With durable storage the sweeper closes such channels; without it the buyer can.
- **Live Aurora exit works.** Solana USDC to Base USDC through the Swap API on mainnet: 0.5 USDC in, 0.497448 USDC out, `PENDING_DEPOSIT` then `PROCESSING` at 1.3 min then `SUCCESS` at 1.6 min. Origin `uFvb9SNV...`, destination `0x78c5e32d...` (`aurora-exit-mainnet.json`).
- **Persistent deposit addresses were issued** for Tron and EVM to Solana USDC on our key, and a dry quote with `confidentiality: basic` was accepted (`PLATFORM_PROBE.md`). No live deposit or confidential top-up was made, so those are probed, not demonstrated.

## Transaction engineering (from `runs/tx/`, real signatures)
| Instruction(s) | Network | Bytes of 1,232 | Compute units | Fee (lamports) |
|---|---|---|---|---|
| open + memo | devnet | 755 | 47,340 | 10,001 |
| open + memo | mainnet | 755 | 39,840 | 10,001 |
| settleAndSeal + distribute (zero charge) | devnet | 602 | 28,255 | 5,001 |
| Ed25519 check + settleAndSeal + distribute (charge above zero) | devnet | 800 | 30,071 | 10,001 |
| Ed25519 check + settleAndSeal + distribute (charge above zero) | mainnet | 800 | 17,326 | 10,001 |
| open, ground salt (255/255) | devnet | not recorded | 31,565 | not recorded |
| open, salt at bumps 253/248 | devnet | not recorded | 55,565 | not recorded |
| requestClose | devnet and mainnet | 206 (devnet) | 271 (both) | 5,000 |
| seal | devnet | 205 | 243 | 5,000 |
| withdrawPayer | devnet | 338 | 12,680 | 5,000 |
| withdrawPayer | mainnet | not recorded | 6,680 | 5,000 |
| distribute (sealed channel, fee payer cleanup) | mainnet | 561 | 15,901 | 5,001 |
| reclaim, two channels in one transaction | mainnet | 264 | 634 | 5,001 |

The same settlement shape used 30,071 compute units on devnet and 17,326 on mainnet. We do not know why; the account state differs between the networks and we did not investigate further.

## Browser run of the paid flow (devnet)
`tests/e2e/paid-flow.spec.ts` drives the real Studio in Chromium with the test-only Wallet Standard wallet against a local devnet server: browser decode and 60 s chunking, the 402, the approval dialog (`Up to $0.01 for 01:00 of audio`), a wallet signature, delivery, captions, the `.srt` download, the receipt page, and disconnect. The `PAYMENT-SIGNATURE` header the browser sent carried amount `10000`, the same amount the dialog showed. It also found two defects now fixed: the test wallet signed with a full-signature call that real wallets do not use, and the local memory store was not shared between API routes and pages.

## Design rule under test (B7)
Never pre-sign a channel `open` inside a cross-chain execution: bridge first, open after arrival with a fresh slot. This follows from the program's 1,500-slot window (confirmed by B4, where a stale `open` fails with 2003). Whether real bridge latencies exceed that window is what B7 measures, and B7 has not been run.

## Wild set
19 of 20 pre-listed clips completed on devnet. 0 overcharges, 0 undercharges, and 0.0% of cues marked "check": the threshold (average log probability below -0.8 or no-speech probability above 0.5) never fired on clean audiobook speech, so it is untested on difficult audio. One clip could not be decoded and was skipped. See `data/wild/SOURCES.md` for the addendum on clip length (about 93 s, not 120 s).
