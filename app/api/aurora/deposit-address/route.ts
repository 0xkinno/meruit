import { NextRequest, NextResponse } from "next/server";
import { AuroraError } from "@/lib/aurora/swap";
import { persistentAddress, singleUseAddress, type DepositChain } from "@/lib/aurora/deposits";
import { ASSETS } from "@/lib/aurora/assets";
import { isValidAddress } from "@/lib/address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAINS: DepositChain[] = ["tron", "evm", "eth", "base", "arb", "bsc", "near", "btc", "ton", "stellar"];

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as { solana?: string; chain?: DepositChain; confidential?: boolean } | null;
  if (!b?.solana || !isValidAddress(b.solana)) return NextResponse.json({ error: "invalid_solana_address" }, { status: 400 });
  if (!b.chain || !CHAINS.includes(b.chain)) return NextResponse.json({ error: "unsupported_chain" }, { status: 400 });
  try {
    return NextResponse.json(await persistentAddress({ solana: b.solana, chain: b.chain, confidential: b.confidential }));
  } catch (e) {
    // Persistent addresses are limited to approved organisations (403). Fall back to a labelled single-use address.
    if (e instanceof AuroraError && (e.status === 403 || e.status === 404)) {
      try {
        const originAsset = b.chain === "tron" ? ASSETS.tronUsdt : ASSETS.baseUsdc;
        return NextResponse.json(await singleUseAddress({ solana: b.solana, originAsset, amount: "1000000", confidential: b.confidential }));
      } catch (e2) { return NextResponse.json({ error: (e2 as Error).message }, { status: e2 instanceof AuroraError ? e2.status : 502 }); }
    }
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof AuroraError ? e.status : 502 });
  }
}
