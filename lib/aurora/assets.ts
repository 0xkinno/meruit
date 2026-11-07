// Asset ids on the NEAR Intents network. `scripts/probe.ts` checks each against the live token list
// and records the result in PLATFORM_PROBE.md; /api/status shows the last measurement.
export const ASSETS = {
  solUsdc: "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near",
  tronUsdt: "nep141:tron-d28a265909efecdcee7c5028585214ea0b96f015.omft.near",
  baseUsdc: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
} as const;

export const FUNDING_CHAINS = [
  { id: "tron", label: "Tron", asset: "USDT", note: "USDT on Tron" },
  { id: "evm", label: "Base, Arbitrum, BNB Chain, Ethereum", asset: "USDC or USDT", note: "One address works on every EVM chain" },
] as const;
