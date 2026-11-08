# EVIDENCE.md

Every claim, with the file or command that backs it. Claims with no evidence are not made.

| Claim | Evidence |
|---|---|
| The hook blocks Claude attribution | `.githooks/commit-msg`; dummy trailer exits 1, plain message exits 0 |
| payment-channels is on mainnet and devnet | `PLATFORM_PROBE.md` rows 1 and 2 |
| USDC has a freeze authority on both networks | `PLATFORM_PROBE.md` USDC rows |
| x402.org lists no Solana `upto` | `PLATFORM_PROBE.md` |
| The server returns an `upto` 402 with amount 120000 for 720 s | `npx tsx scripts/run-job.ts --clip hero --dry` |
| Meter rounds cap up and charge down, never above the cap | `tests/unit/meter.test.ts` |
| No floats in money paths | `tests/unit/meter.test.ts` (source scan) |
| Channel storage is atomic on first open and ignores conflicting bindings | `tests/unit/channelStorage.test.ts` |
| Payer offset for chain-direct discovery is correct | `tests/unit/escape.test.ts` |
| Pages meet layout, tap size, axe AA and zero console errors at 7 viewports | `tests/e2e/viewports.spec.ts`, 56 of 56 |
| Rescue page renders with all `/api` routes blocked | `tests/e2e/wallet.spec.ts` |
| A real 12 minute job on Solana mainnet: $0.12 charged, 178 captions | `runs/live/job_4b422d3f...json`; settle `5Gxz1E5T...` |
| 3 of 12 parts failed: $0.09 charged, $0.03 returned (mainnet and devnet) | `runs/break/B1-mainnet.json`, `B1-devnet.json` |
| The buyer recovered the full deposit alone after the seller process was killed | `runs/break/B2-mainnet.json` (915 s), `B2-devnet.json` |
| A stale `open` fails with `2003` | `runs/break/B4-devnet.json` |
| An overcharge request is refused by the SDK, not the program | `runs/break/raw/job_26f7ff41...json` |
| Rent float is about 0.00197 SOL per job and returned in full | `runs/break/B8-mainnet.json` |
| A short deposit is refunded after 8.0 minutes at a cost of about 20% | `runs/break/B6-mainnet.json` |
| A live exit from Solana to Base took 1.6 minutes | `runs/break/aurora-exit-mainnet.json` |
| Groq transcribes a 60 s clip in 379 ms with confidence fields | `PLATFORM_PROBE.md` |
| Aurora issued persistent addresses for Tron and EVM; confidentiality quote accepted | `PLATFORM_PROBE.md` |
| 25 jobs recorded, 0 overcharges | `docs/FACTS.json` |
