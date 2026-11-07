# PROGRESS.md

Updated 2026-11-07. Author of every commit: 0xkinno.

## Done and verified
- Phase 0 locks: commit-msg hook blocks Claude attribution (test: a dummy message with a Co-Authored-By trailer exits 1, a plain one exits 0); `.claude/settings.json`; the GitHub workflow file is in place but has not run because there is no remote yet.
- Next.js 16 app (Next 15 in the plan; `@x402/next` 2.30.0 requires Next 16.4.1 or later), Tailwind, Framer Motion, Lenis, self-hosted fonts. `typecheck`, `lint`, `build` pass.
- Money-path code: meter, job state machine, Redis channel storage, escape builders, channel discovery, salt grinding, sabotage switch. 43 unit tests pass.
- The x402 `upto` 402 challenge is served for real: for a 720 second job the amount is 120000, fee payer and receiver authorizer advertised, withdraw delay 900.
- Platform probe (`PLATFORM_PROBE.md`): payment-channels is on mainnet and devnet; USDC has a freeze authority on both; x402.org lists no Solana `upto`.
- UI: landing, studio, tab, receipt, trace, rescue, proof, judge, sell, status, guided tour. Playwright: 56 of 56 page and viewport checks pass (no horizontal scroll, no hero overlap, one navbar baseline, 44 px taps, axe WCAG 2.2 AA, zero console errors). Wallet e2e: 4 of 4 (connect, disconnect with power icon, no-wallet message, rescue page renders with every `/api` route blocked).
- Wild set list committed before any run, seeded (`data/wild/SOURCES.md`, commit `2d37112`).
- Vercel project `meruit` created, non-secret env vars set, kill switch `MERUIT_LIVE=off`.

## Not done, and why
- No on-chain job has run. Wallets are generated but unfunded (devnet airdrops are closed). So B1 to B10, the wild set, FACTS, the recorded run, receipts with signatures, salt CU numbers and rent float are all unmeasured. `docs/FACTS.json` says zero jobs.
- Groq, Aurora, Redis and Blob are not configured, so transcription, deposits, exit and persistent storage are untested live. Aurora persistent addresses may be refused (403) for an unapproved key; a single-use fallback is coded.
- Intents Connect: no access, labelled designed.
- Not deployed: the Vercel project has no deployment yet (needs the GitHub repository, then `vercel --prod`).
- Not started: README, video, deck, submission text, red team rounds, Phase 8 and 9, the 7-step tour voice, judge pocket, `RULES_EXTRACT.md` (the Encode page needs a login), lane check searches, `reference/LANE_NOTES.md`.
- MOMENT.md: 2 of 7 source links returned 403 to automated fetch; founder note awaits approval.

## Self-scores (1 to 5, honest, today)
| Criterion | Score | Why |
|---|---|---|
| Clear user need | 3 | persona and sources drafted, none re-read by a person yet |
| Ease of use | 3 | UI built and accessible, flow not run end to end |
| Technical execution on Solana | 3 | correct SDK use and tests; nothing broadcast |
| Working end-to-end | 1 | no job has completed |
| x402 integration | 3 | real 402 observed; settle path unrun |
| Reliability and failure handling | 3 | designed and unit-tested; not exercised on chain |
| Aurora integration | 1 | code only, no key, no run |
| Proof | 1 | no runs recorded |

## Next
1. Fund wallets (see chat), provide GROQ, Aurora, Helius keys; provision Upstash and Blob on Vercel.
2. Push the repo, require `no-claude-attribution`, deploy.
3. Devnet run, then B1, B2, B4, then ask before the first mainnet transaction.
