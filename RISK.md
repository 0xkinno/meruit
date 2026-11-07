# RISK.md

- Maximum loss for a buyer per job is the ceiling she signed. Public cap: $0.25 per job, enforced in `lib/billing/meter.ts` (`job_above_cap`). Per wallet per day: $1, enforced in `lib/guard.ts`. The wallet identity for the daily cap comes from a request header the client sets, so it is a soft limit; the per-job cap is hard.
- Charge rounds down to whole seconds in the buyer's favour. The ceiling rounds up so delivery always fits (unit tests in `tests/unit/meter.test.ts`).
- Integers only. A unit test fails the build if `parseFloat` or `Number(` appears under `lib/billing` or `lib/channels`.
- Withdraw delay is 900 seconds (`MERUIT_WITHDRAW_DELAY_SECS`).
- The seller settles inside the request. A request that returns an error status is not settled by `withX402`, so the buyer's escape hatch or the sweeper returns the money.
- Rent float: the fee payer fronts channel rent for each open job and recovers it at distribute or reclaim. The measured amount is B8 (not yet measured).
- The USDC mint has a freeze authority (confirmed by `scripts/probe.ts` on both networks). payment-channels accepts such mints by design. A frozen escrow account would block refunds until thawed. This is the asset's own risk, disclosed in the README.
- Kill switch: `MERUIT_LIVE=off` refuses new jobs with a 503 before any payment is requested. The Vercel project starts with it off.
- Aurora: funds in flight are under NEAR Intents' settlement. Every quote sets a refund address (`refundTo`, `refundType: ORIGIN_CHAIN`). Statuses are shown as returned by the API.
- The judge pocket exists only on devnet with devnet funds, and is not built yet.
- Secrets: private keys live in `.env.local` and the Vercel environment only. `.env*` is git-ignored except `.env.example`.
