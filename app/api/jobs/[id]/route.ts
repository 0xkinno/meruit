import { NextResponse } from "next/server";
import { jobs, isValidJobId } from "@/lib/jobs";
import { verifyChannelTx } from "@/lib/verifyTx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isValidJobId(id)) return NextResponse.json({ error: "invalid_job_id" }, { status: 400 });
  const job = await jobs.get(id);
  return job ? NextResponse.json(job) : NextResponse.json({ error: "job_not_found" }, { status: 404 });
}

/** Browser reports signatures it observed (open, close, withdraw). Recorded on the receipt; chain remains the source of truth. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isValidJobId(id)) return NextResponse.json({ error: "invalid_job_id" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { state?: string; signature?: string; channelId?: string; payer?: string; note?: string } | null;
  if (!body?.state) return NextResponse.json({ error: "state_required" }, { status: 400 });
  const allowed = ["rejected_by_wallet", "buyer_closing", "sealed", "refunded", "approved", "settled"] as const;
  if (!(allowed as readonly string[]).includes(body.state)) return NextResponse.json({ error: "state_not_reportable" }, { status: 400 });
  // A reported signature is recorded only if it is a real payment-channels transaction on this network.
  if (body.signature) {
    const v = await verifyChannelTx(body.signature).catch((e: Error) => ({ ok: false as const, reason: e.message }));
    if (!v.ok) return NextResponse.json({ error: "signature_not_verified", reason: v.reason }, { status: 422 });
  }
  try {
    if (body.state === "settled") {
      const cur = await jobs.get(id);
      if (cur?.state === "settling") {
        await jobs.transition(id, "settled", { actor: "seller", signature: body.signature, sigName: "settle", channelId: body.channelId, payer: body.payer, result: (body as { paymentResponse?: unknown }).paymentResponse });
        return NextResponse.json(await jobs.transition(id, "closed", { actor: "seller", note: "distribute included in the same settlement" }));
      }
    }
    const job = await jobs.transition(id, body.state as (typeof allowed)[number], { actor: "buyer", signature: body.signature, channelId: body.channelId, payer: body.payer, note: body.note });
    return NextResponse.json(job);
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 409 }); }
}
