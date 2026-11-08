import { NextRequest, NextResponse } from "next/server";
import { address, createSolanaRpc } from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { rpcUrl } from "@/lib/x402/server";
import { usdcMint } from "@/lib/channels/constants";
import { isValidAddress } from "@/lib/address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only balances for the Tab page, through the server's own RPC. The rescue page does not use this: it reads the chain directly. */
export async function GET(req: NextRequest) {
  const a = req.nextUrl.searchParams.get("address") ?? "";
  if (!isValidAddress(a)) return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  try {
    const rpc = createSolanaRpc(rpcUrl());
    const [ata] = await findAssociatedTokenPda({ owner: address(a), mint: address(usdcMint()), tokenProgram: TOKEN_PROGRAM_ADDRESS });
    const [sol, tok] = await Promise.all([rpc.getBalance(address(a)).send(), rpc.getTokenAccountBalance(ata).send().catch(() => null)]);
    return NextResponse.json({ lamports: sol.value.toString(), usdcAtomic: tok ? tok.value.amount : "0" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message.slice(0, 120) }, { status: 502 });
  }
}
