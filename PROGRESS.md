# PROGRESS.md

Updated 2026-11-08. Every commit is authored by `0xkinno`. Repository: https://github.com/0xkinno/meruit . Live: https://meruit-delta.vercel.app

## Done and verified
- **Money path, run for real.** x402 `upto` on Solana payment-channels, self-facilitated: 402, open, delivery, settlement with an override, distribute. Mainnet: a full 12-minute job ($0.12 charged, 178 captions) and B1 ($0.09 charged, $0.03 returned). Devnet: the same plus 19 wild-set jobs. Signatures, bytes and compute units are in `FINDINGS.md` and `runs/tx/`.
- **Buyer escape hatch, run for real on mainnet and devnet** (B2): seller process killed, buyer alone ran `request_close`, `seal`, `withdraw_payer`, zero loss; 915 s on mainnet with the production 900 s delay.
- **Failure behaviours measured:** stale slot refused with `2003` (B4); overcharge refused by the SDK, deposit left escrowed, recovered by the buyer (B5); a replayed signed payment refused (B3); handler errors refunded automatically by the SDK; salt grinding measured 31,565 vs 55,565 CU (B9).
- **Browser:** the paid flow ran in Chromium on devnet with a test wallet (approval equals signed amount, captions, `.srt`, receipt, both reject paths); 3 of 3 tests pass. It found and fixed two defects.
- **Rent float measured and recovered** (B8). The fee payer's mainnet balance went from 10,000,000 to 9,634,993 lamports after all tests, including 300,000 lamports moved to the buyer.
- **Aurora, live on mainnet:** token list, persistent deposit addresses for Tron and EVM to Solana USDC, quotes for Base and Tron, a `confidentiality: basic` quote, a live exit Solana to Base (1.6 min, `SUCCESS`), and B6 (short deposit: `INCOMPLETE_DEPOSIT` then `REFUNDED` after 8.0 min).
- **Groq Whisper live:** 60 s clip in 379 ms with `avg_logprob` and `no_speech_prob`; 12-minute job transcribed in about 4 s.
- **Checks:** typecheck, lint, build, 43 unit tests, Playwright 56 of 56 viewport and accessibility checks, wallet e2e 4 of 4, house-style check, facts check. GitHub Actions CI and the attribution gate pass.
- **Vercel:** project `meruit` deployed from the repository (production alias `meruit-delta.vercel.app`; `meruit.vercel.app` was taken). All pages return 200. Blob store connected.
- `docs/FACTS.json`: 26 jobs (23 devnet, 3 mainnet), 0 overcharges, 5 forced exits.

## Not done, and why
- **Vercel secrets and Redis are not set**, so the live site cannot run jobs. Setting private keys needs your action or a permission rule (see ENV_SETUP.md). `MERUIT_LIVE` is `off` on Vercel. The deployed `/api/status` shows exactly what is missing.
- **Keys were committed to the public repo** by an edit to `.env.example` (commit `1f690c0`). They are now in `.env.local`; the blank `.env.example` is committed locally but not pushed (the push was blocked by a safety check). **Rotate the Groq, Aurora and Helius keys.**
- Sweeper on a schedule: the route and the cleanup manager were exercised by hand (reclaim and distribute on mainnet), but the unattended GitHub schedule has not run because `CRON_SECRET` is not in GitHub Actions secrets and the store is not durable yet.
- B7 (Tron and Base deposit latency) was not run: it needs real funds on those chains.
- No live Aurora deposit from Tron or Base and no confidential top-up. The Base wallet `0x927a59ec0e83aeff4988ea3a646b035cf495aa8f` holds 0.497448 USDC but **0 ETH**, so it cannot pay gas to send; about $0.05 of ETH on Base unblocks the Base deposit, B7 data point and a confidential top-up. Tron needs USDT plus a little TRX. Intents Connect: no access, labelled designed.
- The paid flow on the deployed site with Phantom (needs the Vercel secrets and Redis).
- Not started: video, rendered deck, red-team rounds, Phase 8 and 9 (`batch-settlement`, MCP), judge pocket, `RULES_EXTRACT.md` verbatim, lane-check searches, founder note approval.

## Self-scores (1 to 5, honest, today)
| Criterion | Score | Why |
|---|---|---|
| Clear user need | 3 | persona and sources drafted; two of seven links unverified, founder note unapproved |
| Ease of use | 3 | UI built and accessible; paid flow not yet run through a browser wallet |
| Technical execution on Solana | 4 | mainnet jobs, forced exit, reclaim, all with recorded signatures |
| Working end-to-end | 3 | proven by script on mainnet; not yet through the deployed UI |
| x402 integration | 4 | live `upto`, refusals and auto-refund measured |
| Reliability and failure handling | 4 | B1, B2, B4, B5, B6, B8 measured; B3 and B7 not |
| Aurora integration | 3 | live exit and refund case on mainnet; no live deposit, Connect not live |
| Proof | 3 | real numbers and misses published; wild set on devnet only |
