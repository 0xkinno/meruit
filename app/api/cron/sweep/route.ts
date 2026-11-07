import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getX402, NETWORK } from "@/lib/x402/server";
import { getKV } from "@/lib/store";
import { jobs } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const want = process.env.CRON_SECRET;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!want || !got) return false;
  const a = Buffer.from(got), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Seals abandoned channels at zero charge (the facilitator holds the payee seat) and reclaims rent.
 * One pass per call: the GitHub schedule invokes this every 10 minutes.
 */
async function run(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const started = Date.now();
  const { cleanup, storage } = await getX402();
  const before = (await storage.list(NETWORK())).length;
  const events: { action: string; channelId?: string; transaction?: string }[] = [];
  const mgr = cleanup as unknown as { cleanup(o?: object): Promise<void> };
  await mgr.cleanup({ abandonGraceSecs: 120, maxTxsPerRun: 5, maxTxsPerSigner: 5 });
  const after = (await storage.list(NETWORK())).length;
  const swept = await sweepStuckJobs();
  const result = { at: new Date().toISOString(), channelsBefore: before, channelsAfter: after, closed: Math.max(0, before - after), staleJobsMarked: swept, ms: Date.now() - started, events };
  await getKV().set("meruit:sweeper:last", result);
  await getKV().lpush("meruit:sweeper:log", result, 200);
  return NextResponse.json(result);
}

/** Marks jobs stuck in the middle of delivery as swept so the receipt tells the truth. */
async function sweepStuckJobs(): Promise<number> {
  let n = 0;
  for (const j of await jobs.list(200)) {
    if (["opened", "delivering"].includes(j.state) && Date.now() - j.updatedAt > 5 * 60_000) {
      await jobs.transition(j.id, j.state === "opened" ? "swept" : "seller_silent", { actor: "sweeper", note: "stuck, swept" }).catch(() => undefined);
      n++;
    }
  }
  return n;
}

export const POST = run;
export const GET = run;
