// Aurora Intents Deposits (persistent address) with a labelled single-use fallback.
// Server only. `sender` is a stable opaque id: a hash of the buyer's Solana address.
import { createHash } from "node:crypto";
import { AuroraError, quote } from "./swap";
import { ASSETS } from "./assets";

const base = () => process.env.AURORA_BASE_URL || "https://intents-api.aurora.dev";
export const senderId = (solana: string) => createHash("sha256").update(`meruit:${solana}`).digest("hex").slice(0, 32);

export type DepositChain = "tron" | "evm" | "eth" | "base" | "arb" | "bsc" | "near" | "btc" | "ton" | "stellar" | "sol";
export type DepositAddress = { depositAddress: string; memo?: string; kind: "persistent" | "single_use"; chain: string; note?: string };

export async function persistentAddress(p: { solana: string; chain: DepositChain; confidential?: boolean }): Promise<DepositAddress> {
  const k = process.env.AURORA_API_KEY;
  if (!k) throw new AuroraError("aurora_not_configured", 503);
  const r = await fetch(`${base()}/api/persistent-deposit-address/${k}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ sender: senderId(p.solana), recipient: p.solana, depositChain: p.chain, destinationChain: "sol", destinationAsset: ASSETS.solUsdc, confidential: !!p.confidential }),
    cache: "no-store",
  });
  if (!r.ok) throw new AuroraError(`aurora_deposit_address_${r.status}`, r.status, await r.text());
  const j = (await r.json()) as { depositAddress: string; memo?: string };
  return { depositAddress: j.depositAddress, memo: j.memo, kind: "persistent", chain: p.chain };
}

/** Fallback when the key is not approved for persistent addresses (403): a quote deposit address, single use. */
export async function singleUseAddress(p: { solana: string; originAsset: string; amount: string; confidential?: boolean }): Promise<DepositAddress> {
  const q = await quote({
    dry: false, swapType: "FLEX_INPUT", originAsset: p.originAsset, destinationAsset: ASSETS.solUsdc, amount: p.amount,
    recipient: p.solana, refundTo: p.solana, confidentiality: p.confidential ? "basic" : "public",
  });
  if (!q.quote.depositAddress) throw new AuroraError("aurora_no_deposit_address", 502, q);
  return { depositAddress: q.quote.depositAddress, memo: q.quote.depositMemo, kind: "single_use", chain: "origin", note: "Single-use address: send once, to this address only." };
}

export async function depositStatus(address: string, type: "received" | "success" | "failed") {
  const k = process.env.AURORA_API_KEY;
  if (!k) throw new AuroraError("aurora_not_configured", 503);
  const r = await fetch(`${base()}/api/persistent-deposit-status/${k}?type=${type}&address=${encodeURIComponent(address)}`, { cache: "no-store" });
  if (!r.ok) throw new AuroraError(`aurora_deposit_status_${r.status}`, r.status);
  return (await r.json()) as { deposits: Record<string, unknown>[] };
}
