# DISCOVERY.md

## Delete tests
- Remove payment-channels and `upto`: "charged only for minutes delivered" fails, because an exact SPL transfer cannot be lowered after delivery. Named test: bills-delivered-seconds-only (`tests/unit/meter.test.ts`, "12 minutes with 3 chunks dropped").
- Remove the buyer escape hatch: "even if Meruit disappears" fails. Named test: buyer-recovers-without-seller (`tests/unit/escape.test.ts` planner, plus the rescue page rendering with every `/api` route blocked in `tests/e2e/wallet.spec.ts`). The on-chain forced exit itself is not yet run (B2).
- Remove Aurora Intents Deposits: Tron USDT cannot reach Solana in one send. Named test: tron-usdt-arrives-as-solana-usdc. Not yet run live; it needs an Aurora API key approved for persistent addresses, or a single-use quote address.

## Mechanism (one job)
```
GET/POST /api/transcribe   ->  402 PAYMENT-REQUIRED (upto, amount = ceiling for the declared length)
wallet signs open (ceiling) -> facilitator broadcasts open, escrow, rent from the fee payer
server transcribes chunks    (Groq Whisper), counts delivered seconds
charge = floor(delivered * rate); setSettlementOverrides({ amount: charge })
settle_and_seal + distribute -> seller gets charge, buyer gets ceiling - charge
```
Escape hatch: `request_close`, wait the grace period, `seal`, `withdraw_payer`. The sweeper holds the payee seat and seals abandoned channels at zero charge.

The 402 for a 720 second job was observed locally: scheme `upto`, amount `120000`, `withdrawDelay` 900, `paymentFlow` `escrow`, fee payer and receiver authorizer advertised.
