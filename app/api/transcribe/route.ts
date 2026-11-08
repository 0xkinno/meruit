import { NextRequest, NextResponse } from "next/server";
import { withX402, setSettlementOverrides } from "@x402/next";
import type { RoutesConfig } from "@x402/core/server";
import { getX402, NETWORK, asset } from "@/lib/x402/server";
import { capForSeconds, settleAmount, refundFor } from "@/lib/billing/meter";
import { transcribeChunks, type ChunkInput } from "@/lib/transcribe/groq";
import { activeSabotage, dropIndexes, sabotageLabel } from "@/lib/sabotage";
import { jobs, isValidJobId } from "@/lib/jobs";
import { liveOn, reserveDaily, releaseDaily } from "@/lib/guard";
import { networkName } from "@/lib/channels/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

const json = (body: unknown, status: number) => NextResponse.json(body, { status });

function declaredSeconds(req: { headers: { get(n: string): string | null } }): number {
  return parseInt(req.headers.get("x-meruit-seconds") ?? "0", 10);
}

async function handler(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { jobId?: string; chunks?: ChunkInput[] } | null;
  const jobId = body?.jobId ?? "";
  const chunks = body?.chunks ?? [];
  const declared = declaredSeconds(req);
  const cap = capForSeconds(declared);
  const sab = activeSabotage(req.headers);
  const label = sabotageLabel(sab);

  const existing = await jobs.get(jobId);
  if (!existing) return json({ error: "job_not_found" }, 404);
  await jobs.transition(jobId, "approved", { actor: "buyer" }).catch(() => undefined);
  await jobs.transition(jobId, "opened", { actor: "seller" }).catch(() => undefined);

  // B2: the seller dies after open. The process exits without answering and without settling, which is what a
  // crashed or killed seller looks like to the buyer. Never in production. (A handler that merely returns an
  // error status is refunded automatically by the SDK, which is a separate, recorded behaviour.)
  if (sab.vanish && process.env.VERCEL_ENV !== "production") {
    await jobs.transition(jobId, "seller_silent", { actor: "seller", note: "sabotage:vanish", sabotage: label });
    process.exit(1);
  }
  const sum = chunks.reduce((s, c) => s + (Number.isInteger(c.seconds) ? c.seconds : 0), 0);
  if (chunks.length === 0 || sum > declared) return json({ error: "chunks_exceed_declared_length" }, 400);

  await jobs.transition(jobId, "delivering", { actor: "seller" });
  // Local development only: scripts may serve chunks from 127.0.0.1. Never honoured in production.
  const devAudio = process.env.NODE_ENV !== "production" && process.env.MERUIT_DEV_AUDIO === "1";
  const results = await transcribeChunks(chunks, { failIndexes: dropIndexes(chunks.length, sab.drop), allowAnyUrl: devAudio });
  const deliveredSeconds = results.filter((r) => r.ok).reduce((s, r) => s + r.seconds, 0);
  const failedChunks = results.filter((r) => !r.ok).map((r) => r.index);
  let charge = settleAmount(deliveredSeconds, cap);
  // B5: the server asks for more than the deposit. The program must refuse (settled <= deposit).
  if (sab.overcharge) charge = cap + 1n;

  const res = json({ jobId, results, deliveredSeconds, declaredSeconds: declared, cap: cap.toString(), charge: charge.toString(), refund: sab.overcharge ? "0" : refundFor(cap, charge).toString(), failedChunks, sabotage: label }, 200);
  setSettlementOverrides(res, { amount: charge.toString() });
  await jobs.transition(jobId, "delivered", { deliveredSeconds, charge: charge.toString(), refund: sab.overcharge ? "0" : refundFor(cap, charge).toString(), failedChunks, sabotage: label });
  await jobs.transition(jobId, "settling", { actor: "seller" });
  return res;
}

let wrapped: ((req: NextRequest) => Promise<NextResponse>) | null = null;
async function getWrapped() {
  if (wrapped) return wrapped;
  const { server } = await getX402();
  const routes: RoutesConfig = {
    "POST /api/transcribe": {
      accepts: [{
        scheme: "upto",
        // The cap shown to the buyer equals the deposit the wallet signs: derived from the declared length.
        price: (ctx) => ({ asset: asset(), amount: capForSeconds(parseInt(ctx.adapter.getHeader("x-meruit-seconds") ?? "0", 10)).toString() }),
        network: NETWORK(),
        payTo: process.env.MERUIT_PAY_TO!,
        maxTimeoutSeconds: 120,
      }],
      description: "Subtitles, charged per delivered second",
      mimeType: "application/json",
    },
  };
  wrapped = withX402(handler, routes, server) as unknown as (req: NextRequest) => Promise<NextResponse>;
  return wrapped;
}

export async function POST(req: NextRequest) {
  if (!liveOn()) return json({ error: "paused", message: "Live jobs are paused. Nothing was charged." }, 503);
  if (!process.env.MERUIT_PAY_TO) return json({ error: "pay_to_unconfigured" }, 503);
  const declared = declaredSeconds(req);
  let cap: bigint;
  try { cap = capForSeconds(declared); } catch (e) { return json({ error: (e as Error).message }, 400); }

  // Job id is the idempotency key. Created before the 402 so a retry reuses it.
  const jobId = req.headers.get("x-meruit-job") ?? "";
  if (!isValidJobId(jobId)) return json({ error: "invalid_job_id" }, 400);
  const { job, created } = await jobs.create(jobId, { declaredSeconds: declared, cap: cap.toString(), network: networkName() });
  if (!created && ["settled", "closed", "delivered", "settling"].includes(job.state)) return json({ error: "job_already_done", jobId, state: job.state, result: job.result }, 409);
  if (job.state === "draft") await jobs.transition(jobId, "quoted");

  // Soft daily cap keyed by the declared wallet header; hard per-job cap is enforced by capForSeconds above.
  const wallet = req.headers.get("x-meruit-wallet");
  const paid = !!req.headers.get("payment-signature");
  if (paid && wallet && created === false) { /* retried paid request: already reserved */ }
  else if (paid && wallet) {
    if (!(await reserveDaily(wallet, cap))) return json({ error: "wallet_daily_cap", message: "Daily spending limit reached for this wallet. Nothing was charged." }, 429);
  }
  try {
    const out = await (await getWrapped())(req);
    return out;
  } catch (e) {
    if (wallet && paid) await releaseDaily(wallet, cap).catch(() => undefined);
    return json({ error: "seller_error", message: (e as Error).message }, 500);
  }
}
