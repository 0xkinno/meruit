import { NextRequest, NextResponse } from "next/server";
import { AuroraError, swapStatus } from "@/lib/aurora/swap";
import { depositStatus } from "@/lib/aurora/deposits";
import { screenFor } from "@/lib/aurora/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") ?? "";
  const kind = req.nextUrl.searchParams.get("kind") ?? "persistent";
  if (!address || address.length > 128) return NextResponse.json({ error: "address_required" }, { status: 400 });
  try {
    if (kind === "single_use") {
      const s = await swapStatus(address, req.nextUrl.searchParams.get("memo") ?? undefined);
      return NextResponse.json({ status: s.status, screen: screenFor(s.status), raw: s });
    }
    const [received, success, failed] = await Promise.all([depositStatus(address, "received"), depositStatus(address, "success"), depositStatus(address, "failed")]);
    const status = failed.deposits.length ? "FAILED" : success.deposits.length ? "SUCCESS" : received.deposits.length ? "PROCESSING" : "PENDING_DEPOSIT";
    return NextResponse.json({ status, screen: screenFor(status), counts: { received: received.deposits.length, success: success.deposits.length, failed: failed.deposits.length }, deposits: { received: received.deposits, success: success.deposits, failed: failed.deposits } });
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: e instanceof AuroraError ? e.status : 502 }); }
}
