# PROOF.md

How to reproduce each number. There are no recorded runs yet, so there are no headline numbers.

- Tests: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Platform facts: `npm run probe` (rewrites `PLATFORM_PROBE.md`).
- The 402 challenge: start the app, then `npx tsx scripts/run-job.ts --clip hero --base http://localhost:3000 --dry`.
- Browser checks: build, `next start -p 3112`, then `npx playwright test tests/e2e/viewports.spec.ts`.
- A real job: fund the buyer test wallet and fee payer, set `MERUIT_LIVE=on`, run `npx tsx scripts/run-job.ts --clip hero`. The result lands in `runs/live/`.
- Wild set: `npx tsx scripts/run-wild.ts --base URL` (list is committed in `data/wild/SOURCES.md`).
- Break runs: `npx tsx scripts/run-break.ts B1|B2|B4`.
- Transaction engineering: `npx tsx scripts/record-tx.ts <signature>`.
- Headline numbers: `npm run facts` rewrites `docs/FACTS.json` from `runs/`; CI runs `npm run facts:check`.
