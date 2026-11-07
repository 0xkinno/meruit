# FINDINGS.md

Pre-registered questions B1 to B10. This file is committed before any break run. The commit that registers these questions is the one that adds this file; run `git log --format=%H -n1 -- FINDINGS.md` for its hash. Results are filled in below the table only from files in `runs/break/`. Misses and negative results are published.

| # | Question (pre-registered) | Command | Status | Result file |
|---|---|---|---|---|
| B1 | With 3 of 12 chunks failing upstream, is the buyer charged for 9 minutes and refunded for 3, on chain? | `MERUIT_SABOTAGE=drop:3`, `npx tsx scripts/run-break.ts B1` | not run | none |
| B2 | If the seller returns 503 after open and never settles, can the buyer alone take back the full deposit with request_close, seal, withdraw_payer? How long does it take? | `MERUIT_SABOTAGE=vanish`, `npx tsx scripts/run-break.ts B2` | not run | none |
| B3 | Is a second settlement of the same job refused, and by what (watermark, sealed state, SDK cache)? | manual | not run | none |
| B4 | Does an `open` with open_slot 1,600 slots old fail with `2003 OpenSlotOutOfWindow`, with nothing moved? | `npx tsx scripts/run-break.ts B4` | not run (needs a funded fee payer for simulation) | none |
| B5 | When the server asks to settle above the deposit, who refuses: the SDK or the program? | `MERUIT_SABOTAGE=overcharge`, `npx tsx scripts/run-job.ts` | not run | none |
| B6 | What does a deposit below the minimum do (INCOMPLETE_DEPOSIT or REFUNDED), and how many minutes until the refund? | manual | not run (needs Aurora key and funds) | none |
| B7 | What is the distribution of minutes from send to arrival for Tron and Base deposits, and what fraction exceeds 1,500 slots? | manual, then `npm run facts` | not run | none |
| B8 | How many lamports of rent are fronted per job and how long until `reclaim` returns them? | sweeper plus `scripts/record-tx.ts` | not run | none |
| B9 | How many compute units does `open` and `distribute` use with and without salt grinding to bump 255? | `lib/channels/salt.ts` plus `scripts/record-tx.ts` | not run | none |
| B10 | When the wallet rejects the signature mid-flow, is no channel opened and no charge made, with a clear screen? | wallet e2e with `meruit:e2e:reject` | partly covered: the approval dialog and abort path exist; full flow not run | none |

## Results

None recorded yet. Nothing in this file is a result until a file in `runs/break/` backs it.

## Design rule under test (B7)

Never pre-sign a channel `open` inside a cross-chain execution: bridge first, open after arrival with a fresh slot. The reason is documented in the program docs (`OPEN_SLOT_WINDOW` is 1,500 slots, error 2003). Whether real bridge latencies exceed that window is what B7 measures. Until B7 runs, this is a design rule from the documentation, not a measured finding.
