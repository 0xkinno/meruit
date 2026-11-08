# PROGRESS.md

Updated 2026-11-08. Every commit is authored by `0xkinno`. Repository: https://github.com/0xkinno/meruit . Live: https://meruit-delta.vercel.app

## Done and verified
- **Money path, run for real.** x402 `upto` on Solana payment-channels, self-facilitated: 402, open, delivery, settlement with an override, distribute. Mainnet: a full 12-minute job ($0.12 charged, 178 captions) and B1 ($0.09 charged, $0.03 returned). Devnet: the same plus 19 wild-set jobs. Signatures, bytes and compute units are in `FINDINGS.md` and `runs/tx/`.
- **Buyer escape hatch, run for real on mainnet and devnet** (B2): seller process killed, buyer alone ran `request_close`, `seal`, `withdraw_payer`, zero loss; 915 s on mainnet with the production 900 s delay.
- **Failure behaviours measured:** stale slot refused with `2003` (B4); overcharge refused by the SDK, deposit left escrowed, recovered by the buyer (B5); a replayed signed payment refused (B3); handler errors refunded automatically by the SDK; salt grinding measured 31,565 vs 55,565 CU (B9).
- **Browser:** the paid flow ran in Chromium on devnet with a test wallet (approval equals signed amount, captions, `.srt`, receipt, both reject paths); 3 of 3 tests pass. It found and fixed two defects.
- **Rent float measured and recovered** (B8). The fee payer's mainnet balance went from 10,000,000 to 9,634,993 lamports after all tests, including 300,000 lamports moved to the buyer.
- **Intents Connect, live on mainnet:** one Base signature, 0.11755 USDC arrived in the buyer's Solana wallet in 1.77 minutes (also the first B7 point). It needed no access request; the earlier belief was wrong. The Tab page has a card for it.
- **Deployed site, live:** `MERUIT_LIVE=on`; a real $0.01 mainnet job through the deployed site closed with a chain-verified receipt; the deployed sweeper ran once against Upstash and reclaimed that channel. Vercel Cron is configured daily.
- **Aurora, live on mainnet:** token list, persistent deposit addresses for Tron and EVM to Solana USDC, quotes for Base and Tron, a `confidentiality: basic` quote, a live exit Solana to Base (1.6 min, `SUCCESS`), and B6 (short deposit: `INCOMPLETE_DEPOSIT` then `REFUNDED` after 8.0 min).
- **Groq Whisper live:** 60 s clip in 379 ms with `avg_logprob` and `no_speech_prob`; 12-minute job transcribed in about 4 s.
- **Checks:** typecheck, lint, build, 43 unit tests, Playwright 56 of 56 viewport and accessibility checks, wallet e2e 4 of 4, house-style check, facts check. GitHub Actions CI and the attribution gate pass.
- **Vercel:** project `meruit` deployed from the repository (production alias `meruit-delta.vercel.app`; `meruit.vercel.app` was taken). All pages return 200. Blob store connected.
- `docs/FACTS.json`: 27 jobs (23 devnet, 4 mainnet), 0 overcharges, 5 forced exits, 1 Base deposit measured.

## Not done, and why
- **The scheduled sweeper has not fired yet.** It ran once by hand on the deployed site against Redis. Vercel Cron runs it daily from now on; the optional 10 minute GitHub schedule stays skipped until `CRON_SECRET` is added as a GitHub secret (the repository token available here cannot set it).
- **Rotate the Groq, Aurora and Helius keys that were committed in `.env.example`** (commit `1f690c0`). The file is blank now, but the old values stay in git history. Groq has already been replaced.
- B7: one Base point (Connect, 1.77 minutes). A Tron point and a distribution need USDT plus TRX on Tron and more USDC on Base. The Base wallet `0x927a59ec0e83aeff4988ea3a646b035cf495aa8f` now holds no USDC and almost no ETH.
- No live deposit through a persistent address (Tron or Base) and no confidential top-up, for the same reason: no funds left on those chains.
- The paid flow through Phantom in a real browser (it ran with a test wallet on devnet and by script on mainnet).
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
