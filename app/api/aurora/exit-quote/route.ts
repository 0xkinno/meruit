import { NextRequest, NextResponse } from "next/server";
import { AuroraError, quote } from "@/lib/aurora/swap";
import { ASSETS } from "@/lib/aurora/assets";
import { isValidAddress } from "@/lib/address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEST = { base: ASSETS.baseUsdc, tron: ASSETS.tronUsdt } as const;

/** Exit: Solana USDC to Base USDC or Tron USDT. dry=true previews; dry=false returns the deposit address the wallet pays. */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as { solana?: string; to?: keyof typeof DEST; recipient?: string; amount?: string; dry?: boolean; confidential?: boolean } | null;
  if (!b?.solana || !isValidAddress(b.solana)) return NextResponse.json({ error: "invalid_solana_address" }, { status: 400 });
  if (!b.to || !(b.to in DEST)) return NextResponse.json({ error: "unsupported_destination" }, { status: 400 });
  if (!b.recipient || b.recipient.length < 20 || b.recipient.length > 100) return NextResponse.json({ error: "invalid_recipient" }, { status: 400 });
  if (!b.amount || !/^\d{1,12}$/.test(b.amount) || BigInt(b.amount) <= 0n) return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  try {
    const q = await quote({ dry: b.dry !== false, originAsset: ASSETS.solUsdc, destinationAsset: DEST[b.to], amount: b.amount, recipient: b.recipient, refundTo: b.solana, confidentiality: b.confidential ? "basic" : "public" });
    return NextResponse.json(q);
  } catch (e) { return NextResponse.json({ error: (e as Error).message, detail: e instanceof AuroraError ? e.body : undefined }, { status: e instanceof AuroraError ? e.status : 502 }); }
}
