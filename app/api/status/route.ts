import { NextResponse } from "next/server";
import { runProbes } from "@/lib/probes";
import { networkName } from "@/lib/channels/constants";
import { backendName } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const probes = await runProbes();
  return NextResponse.json({
    network: networkName(), store: backendName(), generatedAt: new Date().toISOString(),
    healthy: probes.every((p) => p.ok !== false), probes,
  }, { headers: { "cache-control": "no-store" } });
}
