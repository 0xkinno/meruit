# TASK.md: MERUIT

> **Status 2026-11-08.** `[x]` means verified against a real run, file or check. Items left `[ ]` are not done or only partly done; the reasons are in PROGRESS.md. Caveats on ticked items: the wild set is 19 of 20 clips and devnet only; the live exit and B6 were signed by the buyer test key through scripts, not through a browser wallet; the Next.js version is 16, not 15 (an `@x402/next` peer requirement).

Work top to bottom. Each phase depends on the ones above it. Mark `[x]` only after the item is verified (test passes, page loads on the deployed URL, signature confirmed on an explorer). Update `PROGRESS.md` at the end of every phase with what was done, what is next and the self-judging scores. Commit after every checked item or small group of items. Author: `0xkinno` only.

The ship line: Phases 0 to 7 plus 10 to 12 make a complete, winning submission. Phases 8 and 9 start only when everything above them is green.

---

## Phase 0. Ground rules and repo

- [ ] Read `HACKATHON_WINNING_SYSTEM_V5.md` fully, then `MERUIT_BUILD_INSTRUCTION.md` fully
- [x] Create repo `0xkinno/meruit`; set `user.name` and `user.email` to 0xkinno; `core.hooksPath .githooks`
- [x] `.gitignore` includes `reference/`, `.secrets/`, `.env*` (except `.env.example`), `node_modules/`, `.next/`
- [x] `.claude/settings.json` with empty attribution (Part 17.2)
- [x] `.githooks/commit-msg` blocks Claude attribution (Part 17.3); test it with a dummy message that must fail
- [x] `.github/workflows/no-claude-attribution.yml` (Part 17.4); push and confirm PASS
- [ ] Ask Kinnoski to make `no-claude-attribution` a required check on `main`
- [ ] Next.js 15 + TypeScript + Tailwind + Framer Motion scaffold; deploy the empty app to Vercel at its final URL; add `scripts/reachability.ts` that curls every public path
- [ ] Clone all repos in Part 7 into `reference/`; unpack the Aurora npm packages there; write `reference/LANE_NOTES.md` (never committed)

## Phase 1. Gates G0 to G4 (documents first, code after)

- [ ] `RULES_EXTRACT.md`: verbatim tracks, criteria, requirements, Encode form tabs, deadline in WAT (Mon 9 Nov 12:59)
- [x] `LANE_MAP.md`: committed version describes lanes in neutral words only (no names); full version in `reference/`
- [ ] Lane check (V5 22.8): Discord, X, GitHub searches done; results in `reference/LANE_NOTES.md`
- [ ] `SPONSOR_INTEL.md` (Part 4) with links and quotes
- [ ] `MOMENT.md` (Part 3) with every source link verified and dated; founder note approved by Kinnoski
- [x] `DISCOVERY.md` (Part 5.1 delete tests, 5.2 mechanism)
- [x] `THESIS.md` (Part 6) and `RISK.md` (Part 10)
- [x] `DESIGN.md` (Part 12.1)
- [x] Pre-register `FINDINGS.md` questions B1 to B10 and commit (hash recorded) before any break run

## Phase 2. Platform probe (G5): `PLATFORM_PROBE.md` from `scripts/probe.ts`

- [x] Generate keys with `scripts/keys.ts` (fee payer, receiver authorizer, devnet sponsor); print public keys only; ask Kinnoski to fund the mainnet fee payer (0.05 SOL)
- [x] payment-channels account exists on mainnet (`CHNLx...`), and on devnet (record yes or no; this decides the judge pocket)
- [x] x402.org facilitator `/supported` recorded (expect devnet `exact` only)
- [x] `@x402/*` 2.30.0 installed; confirm exports `upto/client`, `upto/server`, `upto/facilitator` and the `withX402` / `setSettlementOverrides` signatures from the type files
- [x] Groq Whisper call on one 60 s clip; record latency and `verbose_json` fields
- [x] Aurora: persistent deposit address call works with the API key for `tron` and `evm` to Solana USDC (or record the error and switch to the labelled single-use 1Click address)
- [ ] Aurora deposit status call works
- [x] Aurora Swap API `POST /api/quote/{apiKey}` `dry: true` quote Solana USDC to Base USDC and to Tron USDT; base host confirmed
- [x] Confidential mode: a `dry: true` quote with `confidentiality: "basic"` succeeds or fails (record which; decides Part 5.5)
- [x] Intents Connect access: yes or no; if yes, `GET /api/v1/executions/{wallet}/intermediary` returns `result.solana` for a test EVM wallet and a test Tron wallet
- [ ] USDC is on the Kora fee-mint allow-list (a `dry: true` steps create with USDC returns a network fee, not `400`)
- [ ] Read every Aurora resource listed in Part 20 (docs pages, demos, X case studies, YouTube); note plan changes in `SPONSOR_INTEL.md`
- [ ] Upstash Redis and Vercel Blob reachable from a deployed route
- [x] `/api/status` shows all probe results with timestamps (measured, nothing hard-coded)

## Phase 3. The money path on Solana (Web3 build order steps 1 to 5)

- [x] `lib/billing/meter.ts` with unit tests (cap rounds up, charge rounds down, charge never above cap, zero delivery charges zero, no floats)
- [x] `RedisPaymentChannelStorage` implementing the SDK's channel storage interface, with tests
- [x] In-process facilitator and resource server (`lib/x402/server.ts`) on devnet first if the program exists there, otherwise on a Surfpool mainnet fork
- [x] `/api/transcribe` returns 402 with an `upto` requirement whose `amount` equals the cap for the declared length
- [x] Node test client (keypair signer) completes: 402, open, deliver, settle with an override, distribute; record signatures
- [ ] Salt grinding to bump 255 (`lib/channels/salt.ts`); record CU with and without (B9)
- [x] Job state machine in Redis with job id as idempotency key; a retried request never opens a second channel (test)
- [x] Escape hatch builders (`lib/channels/escape.ts`): `requestClose`, `seal`, `withdrawPayer`; test the full forced exit on devnet or fork
- [ ] "Get my money back" reads channel state from chain directly; works with all `/api/*` routes disabled (test)
- [ ] Sweeper route with `UptoSvmRentCleanupManager` (or equivalent) and `CRON_SECRET`; seals an abandoned channel at zero charge (test)
- [ ] `lib/sabotage.ts` with `drop:N`, `vanish`, `double_settle`, `stale_slot`, `overcharge`; each produces the expected refusal or refund (tests)
- [x] `scripts/record-tx.ts` writes instructions, bytes of 1,232, CU, fee for any signature

## Phase 4. The real work: transcription

- [ ] Browser chunker: decode, resample 16 kHz mono, 60 s WAV chunks, client upload to Vercel Blob with progress
- [x] Server Groq transcription per chunk with segment confidence; failed chunks marked "not delivered"
- [x] Cues with "check" marking (threshold documented); `.srt` and `.vtt` builders with tests (timing offsets per chunk)
- [x] Three sample clips bundled (public domain, licences in `data/samples/SOURCES.md`), one is the hero clip with video

## Phase 5. Mainnet with capped funds (ask Kinnoski first)

- [x] Kinnoski approves the first mainnet transaction and funds the buyer test wallet
- [x] Switch `NEXT_PUBLIC_NETWORK=mainnet`; caps and kill switch active; status page shows mainnet probes
- [ ] One real job on mainnet end to end from the deployed UI with Phantom; signatures recorded
- [x] B1 (drop 3 chunks) on mainnet; B2 (seller vanishes, forced exit) on mainnet; signatures recorded
- [ ] B3, B4, B5 refusals recorded with decoded errors (mainnet or fork, state which)
- [x] B8 rent float measured and recovered
- [ ] One unattended sweeper run from the GitHub schedule sealing a deliberately abandoned channel; link the Actions log

## Phase 6. Aurora Intents (mainnet, small real funds)

- [ ] Tab page: chain selector, persistent deposit address (or labelled single-use), QR, memo when required, plain-words status line
- [ ] Live deposit: Tron USDT to Solana USDC arrives in the buyer wallet; origin and destination hashes recorded; minutes measured
- [ ] Live deposit from Base USDC (EVM shared address); recorded
- [x] B6: short deposit to force `INCOMPLETE_DEPOSIT` or `REFUNDED`; refund hash and minutes recorded; designed screen shown
- [ ] B7: settlement latency table from all real deposits; fraction above 1,500 slots computed; design rule written in `FINDINGS.md`
- [x] Exit: Solana USDC to Base USDC (or Tron USDT) through the Aurora Swap API; buyer wallet signs; status timeline; recorded
- [ ] If confidential mode passed G5: one confidential top-up recorded with explorer links (Part 5.5); toggle on the Tab page. If not: labelled "designed", toggle hidden
- [ ] If Connect access exists: Tron steps-only path (REST, TronLink signature) moves USDC from the intermediary to the buyer's wallet; execution id and Solana tx recorded
- [x] Every Aurora terminal state has its own screen (tests with recorded responses labelled as fixtures)
- [ ] If Connect access exists: Part 5.4 recipe live from MetaMask; execution id, origin tx, Solana tx recorded. If not: labelled "designed" in UI, README and `SDK_SURFACE.md`
- [x] `FRICTION_REPORT.md` started (sponsor friction only; never in headlines)

## Phase 7. Product UI (Part 12)

- [x] Fonts self-hosted (Zodiak, Switzer, Martian Mono) with licence file
- [x] Colour tokens in Tailwind config; contrast checked
- [x] Mark, favicon, OG image, four section icons as SVG
- [x] Square capsule navbar with Connect wallet and power-icon disconnect; mobile sheet
- [x] Hero SVG scene (Part 12.4) positioned per spec, never overlapping text, perspective wrapper, glow behind
- [x] GlowCard hover glow on all landing cards; section reveals; Lenis on landing; reduced-motion respected
- [x] Landing sections 1 to 8 (Part 12.3), every number from FACTS
- [ ] Studio: player with captions over video, meter rail, cue list with "check" cues, inline edit, export
- [x] Approval screen shows the decoded requirement in plain words; shown amount equals signed `maxAmount` (test)
- [x] Tab, Receipt, Trace, Get my money back, Proof, Status pages
- [ ] Refusal, waiting, pause and failure states designed as carefully as success
- [x] Playwright viewport matrix (Part 12.7): no overlap, no horizontal scroll, one-baseline navbar, 44 px taps, zero console errors, axe AA
- [ ] Wallet e2e with the test-only Wallet Standard wallet (connect, approve, captions, receipt, disconnect, reject path, forced exit)
- [ ] Screenshots to `docs/screens/` (landing banner plus four for the 2x2 grid)

## Phase 8. Optional: the long tab (`batch-settlement`), only if Phases 0 to 7 are green

- [ ] Translation of cues per line through an x402 `batch-settlement` client-signed channel (one deposit, many requests)
- [ ] Cooperative refund of the unused tab; signatures recorded
- [ ] `SDK_SURFACE.md` and README updated; if not finished, it stays "not used, so not claimed"

## Phase 9. Optional: second door, only if Phase 8 is done or skipped and everything else is green

- [ ] `/sell` page: how a seller charges per delivered unit with the same route pattern
- [ ] Small MCP server exposing "transcribe" so an AI agent pays from a capped key through the same backend (same rules, never a weaker copy)

## Phase 10. Proof and evidence

- [x] `data/wild/SOURCES.md` committed with seed before the run; `scripts/run-wild.ts` on 20 clips (19 completed on devnet, 1 skipped, see addendum) (mainnet with caps, or devnet stated)
- [ ] `scripts/run-break.ts` results for B1 to B10 in `runs/break/`
- [ ] Counterfactual (Part 11.3) computed and shown
- [x] `scripts/facts.ts` writes `docs/FACTS.json`; CI `--check` fails on mismatch; README and UI read only from it; `/api/stats` live
- [ ] `EVIDENCE.md` (every claim with a file, link or signature), `PROOF.md` (how to reproduce each number), `MILESTONES.md` (dated milestones from git history), `SDK_SURFACE.md` (Part 18 with file:line)
- [x] `FINDINGS.md` complete with misses and negative results; `FRICTION_REPORT.md` complete

## Phase 11. Judge experience and red team

- [ ] `/judge` 60-second walk; recorded run plays captions within 15 s
- [ ] Guided tour (7 steps, chapters, keys, optional pre-rendered voice labelled synthetic, `?tour=1&render=1`)
- [ ] Judge pocket on devnet (if the program exists there) with rate limit, or the capped mainnet demo button (ask Kinnoski)
- [ ] `JUDGE.md` (60 s, 3 min, 10 min paths)
- [ ] Red team: five fresh judge agents (V5 Appendix B) on the deployed URL; `REDTEAM_LOG.md`; fix and repeat until a clean round
- [ ] V5 Part 17 blocking questions all "yes"

## Phase 12. README, video, deck, submission

- [ ] README in the exact order of Part 14; house-style check passes; counts and numbering consistent
- [ ] Video 2 to 4 minutes per Part 15; synthetic voice and replays labelled; uploaded; timestamps listed
- [ ] `DECK.md` (8 slides); Kinnoski renders the slides and shares the link
- [ ] `SUBMISSION_ENCODE.md` mirrors Description, Code, Slides, Live Demo, Demo Video
- [ ] Reachability script passes on the production URL
- [ ] Kinnoski submits on Encode at least 2 hours before Mon 9 Nov 12:59 WAT
- [ ] Tag the submitted commit `v1.0-encode`; freeze the deployment until results
