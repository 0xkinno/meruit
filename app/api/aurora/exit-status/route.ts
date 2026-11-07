import { NextRequest, NextResponse } from "next/server";
import { AuroraError, submitDeposit, swapStatus } from "@/lib/aurora/swap";
import { screenFor } from "@/lib/aurora/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const a = req.nextUrl.searchParams.get("depositAddress") ?? "";
  if (!a) return NextResponse.json({ error: "depositAddress_required" }, { status: 400 });
  try { const s = await swapStatus(a, req.nextUrl.searchParams.get("memo") ?? undefined); return NextResponse.json({ status: s.status, screen: screenFor(s.status), raw: s }); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: e instanceof AuroraError ? e.status : 502 }); }
}

/** The buyer's wallet signed the SPL transfer; this tells Aurora which transaction to look for. */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as { txHash?: string; depositAddress?: string; memo?: string } | null;
  if (!b?.txHash || !b.depositAddress) return NextResponse.json({ error: "txHash_and_depositAddress_required" }, { status: 400 });
  try { return NextResponse.json(await submitDeposit({ txHash: b.txHash, depositAddress: b.depositAddress, memo: b.memo })); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: e instanceof AuroraError ? e.status : 502 }); }
}
