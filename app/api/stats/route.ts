import { NextResponse } from "next/server";
import { jobs } from "@/lib/jobs";
import { backendName } from "@/lib/store";
import { formatUsdc } from "@/lib/billing/meter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Headline numbers recomputed from stored jobs on every request. */
export async function GET() {
  if (backendName() === "unconfigured") return NextResponse.json({ error: "store_unconfigured" }, { status: 503 });
  const all = await jobs.list(500);
  const settled = all.filter((j) => ["settled", "closed"].includes(j.state));
  let capSum = 0n, chargeSum = 0n, overcharges = 0;
  for (const j of settled) {
    const cap = BigInt(j.cap), ch = BigInt(j.charge ?? "0");
    capSum += cap; chargeSum += ch; if (ch > cap) overcharges++;
  }
  return NextResponse.json({
    jobs: all.length, settled: settled.length, overcharges,
    returnedAtomic: (capSum - chargeSum).toString(), returnedUsd: formatUsdc(capSum - chargeSum),
    forcedExits: all.filter((j) => j.state === "refunded").length,
    generatedAt: new Date().toISOString(),
  }, { headers: { "cache-control": "no-store" } });
}
