/**
 * Runs one real job from Node with the buyer test key: 402 -> open -> deliver -> settle -> distribute.
 * Usage: tsx scripts/run-job.ts --clip hero|mid|short|<path> [--base URL] [--dry] [--out runs/live] [--sabotage drop:3]
 * --dry stops after the 402 challenge and prints the decoded requirement (no signature, no funds).
 */
import { base58 } from "@scure/base";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { UptoSvmScheme } from "@x402/svm/upto/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { need, network, rpcUrl } from "./lib/env";
import { decodeClip, hostChunks } from "./lib/audio";
import { capForSeconds } from "../lib/billing/meter";
import { describeRequirement } from "../lib/x402/describe";
import { cuesFromChunks } from "../lib/srt";
import { signSabotage } from "../lib/sabotage";

const arg = (n: string, d?: string) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? (process.argv[i + 1]?.startsWith("--") || !process.argv[i + 1] ? "1" : process.argv[i + 1]) : d; };
const CLIPS: Record<string, string> = { short: "public/samples/short-1min.mp3", mid: "public/samples/mid-3min.mp3", hero: "public/samples/hero-12min.mp3" };

export async function runJob(opts: { clip: string; base: string; dry?: boolean; out?: string; sabotage?: string; wild?: boolean; label?: string }) {
  const path = CLIPS[opts.clip] ?? opts.clip;
  const { chunks, totalSeconds } = decodeClip(path);
  const cap = capForSeconds(totalSeconds);
  const jobId = `job_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const hosted = await hostChunks(jobId, chunks);
  const headers: Record<string, string> = { "content-type": "application/json", "x-meruit-seconds": String(totalSeconds), "x-meruit-job": jobId };
  if (opts.sabotage && process.env.MERUIT_SIGNING_SECRET) headers["x-meruit-sabotage"] = `${opts.sabotage}.${signSabotage(opts.sabotage, process.env.MERUIT_SIGNING_SECRET)}`;
  const body = JSON.stringify({ jobId, chunks: hosted.urls });
  const started = Date.now();
  try {
    if (opts.dry) {
      const r = await fetch(`${opts.base}/api/transcribe`, { method: "POST", headers, body });
      const pr = r.headers.get("payment-required");
      console.log(`HTTP ${r.status}`);
      if (pr) { const j = JSON.parse(Buffer.from(pr, "base64").toString()); console.log(JSON.stringify(describeRequirement(j.accepts[0], totalSeconds), null, 2)); console.log(`ceiling atomic ${j.accepts[0].amount}, expected ${cap}`); }
      return null;
    }
    const buyer = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_BUYER_TEST_KEY")));
    headers["x-meruit-wallet"] = buyer.address;
    const client = new x402Client();
    client.register("solana:*", new UptoSvmScheme(buyer, { rpcUrl: rpcUrl() }));
    const pay = wrapFetchWithPayment(fetch, client);
    const res = await pay(`${opts.base}/api/transcribe`, { method: "POST", headers, body });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch { /* keep raw */ }
    const rawPr = res.headers.get("payment-response");
    const paymentResponse = rawPr ? JSON.parse(Buffer.from(rawPr, "base64").toString()) : null;
    const results = (data.results ?? []) as { index: number; ok: boolean; segments: never[] }[];
    const cues = cuesFromChunks(results);
    const run = {
      id: jobId, kind: opts.label ?? "job", wild: !!opts.wild, network: network(), status: res.status, clip: opts.clip, declaredSeconds: totalSeconds,
      cap: String(data.cap ?? cap), charge: data.charge as string | undefined, refund: data.refund as string | undefined,
      deliveredSeconds: data.deliveredSeconds, failedChunks: data.failedChunks, cueList: cues, cues: cues.length, checkCues: cues.filter((c) => c.check).length,
      sabotage: opts.sabotage ?? "off", paymentResponse, error: res.ok ? undefined : data, latencyMs: Date.now() - started, at: new Date().toISOString(),
    };
    // Report the settlement the way the browser does, so the receipt shows the signature and a closed job.
    if (res.ok && paymentResponse?.transaction && !opts.base.includes("localhost")) {
      await fetch(`${opts.base}/api/jobs/${jobId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: "settled", signature: paymentResponse.transaction, payer: buyer.address, paymentResponse }) }).catch(() => undefined);
    }
    const dir = opts.out ?? "runs/live";
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/${jobId}.json`, JSON.stringify(run, null, 2) + "\n");
    console.log(JSON.stringify({ ...run, cueList: undefined, paymentResponse: paymentResponse ? "recorded" : null }, null, 2));
    return run;
  } finally { hosted.close(); }
}

if (process.argv[1]?.endsWith("run-job.ts")) {
  runJob({ clip: arg("clip", "short")!, base: (arg("base", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")!).replace(/\/$/, ""), dry: arg("dry") === "1", out: arg("out"), sabotage: arg("sabotage") }).catch((e) => { console.error(e); process.exit(1); });
}
