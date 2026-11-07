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
| Nothing has been charged on chain | `docs/FACTS.json` has zero jobs |
