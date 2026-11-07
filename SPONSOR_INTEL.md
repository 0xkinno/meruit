# SPONSOR_INTEL.md

Each point below was read from a primary source on 2026-11-07 unless marked otherwise.

## Solana Foundation payment-channels
Source: `docs/003-program-instructions.md` in https://github.com/solana-foundation/payment-channels
- Program id `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX`. `scripts/probe.ts` found an executable account at that address on both mainnet and devnet.
- Instructions: `open`, `settle`, `topUp`, `settleAndSeal`, `requestClose`, `seal`, `distribute`, `withdrawPayer`, `reclaim`.
- Quote: "A flow that misses it must re-derive with a fresh open_slot (a new channel address) and re-sign." `open_slot` must satisfy `clock.slot - open_slot <= OPEN_SLOT_WINDOW` (1,500 slots, about 10 minutes).
- Quote: "CU-conscious clients SHOULD grind it until both the channel PDA and the escrow ATA land on bump 255", about 1,500 CU per bump iteration below 255. Implemented in `lib/channels/salt.ts`.
- Mint trust model: `open` does not reject mints with a live freeze authority. Confirmed USDC has one on both networks.

## x402 v2 on Solana
Source: `@x402/*` 2.30.0 type definitions and `examples/typescript` in https://github.com/x402-foundation/x402
- `@x402/svm` exports `upto/client`, `upto/server`, `upto/facilitator` and `batch-settlement/*`.
- `@x402/next` 2.30.0 requires Next.js 16.4.1 or later (peer dependency), so this build uses Next 16, not Next 15 as the plan said.
- The x402.org facilitator `/supported` lists Solana `exact` on devnet only, no Solana `upto`. Meruit self-facilitates.
- `price` accepts a function of the request, which is how the ceiling follows the declared job length without one route per bucket.

## Aurora Intents
Source: https://docs.intents.aurora.dev (API reference pages as markdown), read 2026-11-07
- Persistent deposit address: "Creating new addresses is limited to organisations approved by Aurora; any other API key receives a 403." Request also requires `destinationChain` and accepts `confidential`. This changes the plan: Meruit falls back to a labelled single-use quote address when the key is not approved (`app/api/aurora/deposit-address/route.ts`).
- Swap API quote requires `depositType` as well as the fields listed in the plan; statuses are `KNOWN_DEPOSIT_TX`, `PENDING_DEPOSIT`, `INCOMPLETE_DEPOSIT`, `PROCESSING`, `SUCCESS`, `REFUNDED`, `FAILED`.
- Confidentiality is a `confidentiality` quote field (`public`, `basic`, `advanced`). Whether it works on our key is not yet probed (no key).
- Intents Connect access is not available to this build. It is labelled designed.
- Not yet done: reading the X posts, YouTube and demo pages listed in the plan. Those could not be opened here.

## Quote for the pitch
"Apps lose users at the funding step, and most of those users already hold assets somewhere else." This line comes from the build instruction (attributed there to the Aurora CEO, Solflare announcement, Jul 30 2026). It has not been re-verified at its source from this environment, so do not publish it as a quote until it is checked.
