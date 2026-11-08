/**
 * Break campaign B1 to B10 (MERUIT_BUILD_INSTRUCTION Part 5.3). Each result is written to runs/break/<id>.json
 * and published on /proof, including misses. Questions are pre-registered in FINDINGS.md by commit hash.
 *
 * Usage: tsx scripts/run-break.ts <B1|B2|B4|...> --base URL
 *  B1  drop:3        server must be started with MERUIT_SABOTAGE=drop:3 (or a preview with the signed header)
 *  B2  vanish        server started with MERUIT_SABOTAGE=vanish; then this script walks the forced exit from the buyer key
 *  B4  stale_slot    simulates an `open` whose open_slot is 1,600 slots old and records the decoded program error
 * B3 replays one signed payment under a second job id. B5 to B10 are run by other scripts or manually; this runner refuses them rather than faking a result.
 */
import { base58 } from "@scure/base";
import {
  address, appendTransactionMessageInstructions, createKeyPairSignerFromBytes, createSolanaRpc, createTransactionMessage,
  getBase64EncodedWireTransaction, pipe, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners,
} from "@solana/kit";
import { mkdirSync, writeFileSync } from "node:fs";
import { need, network, rpcUrl } from "./lib/env";
import { runJob } from "./run-job";
import { findChannelsByPayer } from "../lib/channels/discover";
import { escapeInstruction, nextEscapeStep, readChannel, rpcFor } from "../lib/channels/escape";
import { sendInstructions } from "./lib/send-node";
import { getOpenInstructionAsync } from "../lib/channels/generated/instructions/open";
import { deriveChannel } from "../lib/channels/salt";
import { usdcMint } from "../lib/channels/constants";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { UptoSvmScheme } from "@x402/svm/upto/client";
import { decodeClip, hostChunks } from "./lib/audio";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined; };
const save = (id: string, rec: object) => { mkdirSync("runs/break", { recursive: true }); writeFileSync(`runs/break/${id}-${network()}.json`, JSON.stringify({ id, network: network(), at: new Date().toISOString(), ...rec }, null, 2) + "\n"); console.log(JSON.stringify(rec, null, 2)); };

async function b1(base: string) {
  const r = await runJob({ clip: "hero", base, out: "runs/break/raw", sabotage: "drop:3", label: "B1" });
  const ok = r && r.charge === "90000" && r.refund === "30000";
  save("B1", { title: "drop 3 of 12 chunks", result: ok ? "charged 9 minutes, refunded 3 minutes" : "UNEXPECTED: see raw run", cap: r?.cap, charge: r?.charge, refund: r?.refund, failedChunks: r?.failedChunks, paymentResponse: r?.paymentResponse, expected: { charge: "90000", refund: "30000" } });
}

async function b2(base: string) {
  const buyer = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_BUYER_TEST_KEY")));
  const t0 = Date.now();
  // The server process exits after the open lands, so the request fails at the socket. That is the point.
  const r = await runJob({ clip: "hero", base, out: "runs/break/raw", sabotage: "vanish", label: "B2" }).catch((e) => { console.log(`seller died as intended: ${(e as Error).message}`); return null; });
  const rpc = rpcFor(rpcUrl());
  const sigs: Record<string, string> = {};
  const channels = (await findChannelsByPayer(rpc, buyer.address)).filter((c) => c.status !== "distributed");
  const ch = channels[0];
  if (!ch) { save("B2", { title: "seller vanishes after open", result: "NO CHANNEL FOUND: the open did not land", raw: r ? r.status : "connection lost" }); return; }
  for (let guard = 0; guard < 6; guard++) {
    const v = await readChannel(rpc, ch.id);
    const step = nextEscapeStep(v, Math.floor(Date.now() / 1000));
    if (step.kind === "wait") { console.log(`waiting ${step.secondsLeft}s for the safety delay`); await new Promise((res) => setTimeout(res, (step.secondsLeft + 3) * 1000)); continue; }
    if (step.kind === "done" || step.kind === "missing") break;
    const ix = await escapeInstruction(step, buyer, v!);
    sigs[step.kind] = await sendInstructions(buyer, [ix], rpcUrl());
    console.log(step.kind, sigs[step.kind]);
  }
  const final = await readChannel(rpc, ch.id);
  save("B2", { title: "seller vanishes after open, buyer forced exit", result: final ? `final status ${final.status}` : "channel closed", elapsedSeconds: Math.round((Date.now() - t0) / 1000), channel: ch.id, depositAtomic: ch.deposit.toString(), signatures: sigs });
}

async function b4() {
  const buyer = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_BUYER_TEST_KEY")));
  const feePayer = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_FEE_PAYER_KEY")));
  const authorizer = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_RECEIVER_AUTHORIZER_KEY")));
  const rpc = createSolanaRpc(rpcUrl());
  const slot = await rpc.getSlot().send();
  const openSlot = slot - 1600n;
  const mint = usdcMint();
  const d = await deriveChannel({ payer: buyer.address, payee: feePayer.address, mint, authorizedSigner: authorizer.address, openSlot }, 1n);
  const { findAssociatedTokenPda } = await import("@solana-program/token");
  const [payerAta] = await findAssociatedTokenPda({ owner: buyer.address, mint: address(mint), tokenProgram: address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") });
  const TOKEN = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const ix = await getOpenInstructionAsync({
    payer: buyer, rentPayer: feePayer, payee: feePayer.address, mint: address(mint), authorizedSigner: authorizer.address, channel: d.channel,
    payerTokenAccount: payerAta, channelTokenAccount: d.escrow, tokenProgram: TOKEN,
    rent: address("SysvarRent111111111111111111111111111111111"), associatedTokenProgram: address("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
    openArgs: { salt: 1n, deposit: 10000n, gracePeriod: 900, openSlot, recipients: [{ recipient: address(need("MERUIT_PAY_TO")), bps: 10000 }] },
  });
  const { value: bh } = await rpc.getLatestBlockhash().send();
  const msg = pipe(createTransactionMessage({ version: 0 }), (m) => setTransactionMessageFeePayerSigner(feePayer, m), (m) => setTransactionMessageLifetimeUsingBlockhash(bh, m), (m) => appendTransactionMessageInstructions([ix], m));
  const tx = await signTransactionMessageWithSigners(msg);
  const sim = await rpc.simulateTransaction(getBase64EncodedWireTransaction(tx), { encoding: "base64", sigVerify: false, replaceRecentBlockhash: true }).send();
  const logs = (sim.value.logs ?? []).join("\n");
  const err = JSON.stringify(sim.value.err, (_, v) => (typeof v === "bigint" ? v.toString() : v));
  const is2003 = /custom program error: 0x7d3|"Custom":2003|Custom\\":2003/.test(`${logs} ${err}`);
  save("B4", { title: "open with open_slot 1,600 slots in the past", result: !sim.value.err ? "UNEXPECTED: simulation succeeded" : is2003 ? "refused with 2003 OpenSlotOutOfWindow" : "refused, but not with 2003: read err and logs before claiming this proves the window",  openSlot: openSlot.toString(), currentSlot: slot.toString(), err, expected: "custom program error 2003 (0x7d3) OpenSlotOutOfWindow", logs: logs.slice(-800), method: "simulateTransaction, nothing broadcast" });
}

/**
 * B3: the same signed payment sent twice. The first request pays and delivers. The second request carries the identical
 * PAYMENT-SIGNATURE header under a new job id, so our own job guard cannot be what stops it: the refusal must come from the
 * x402 SDK or the program. The result records the status and the decoded reason.
 */
async function b3(base: string) {
  const buyer = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_BUYER_TEST_KEY")));
  const { chunks, totalSeconds } = decodeClip("public/samples/short-1min.mp3");
  const id = () => `job_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const [jobA, jobB] = [id(), id()];
  const hostedA = await hostChunks(jobA, chunks);
  const hostedB = await hostChunks(jobB, chunks);
  const headersBase = (job: string) => ({ "content-type": "application/json", "x-meruit-seconds": String(totalSeconds), "x-meruit-job": job });
  try {
    const first = await fetch(`${base}/api/transcribe`, { method: "POST", headers: headersBase(jobA), body: JSON.stringify({ jobId: jobA, chunks: hostedA.urls }) });
    const pr = first.headers.get("payment-required");
    if (first.status !== 402 || !pr) throw new Error(`expected a 402, got ${first.status}`);
    const client = new x402Client();
    client.register("solana:*", new UptoSvmScheme(buyer, { rpcUrl: rpcUrl() }));
    const http = new x402HTTPClient(client);
    const payload = await http.createPaymentPayload(decodePaymentRequiredHeader(pr));
    const payHeaders = http.encodePaymentSignatureHeader(payload);
    const r1 = await fetch(`${base}/api/transcribe`, { method: "POST", headers: { ...headersBase(jobA), ...payHeaders }, body: JSON.stringify({ jobId: jobA, chunks: hostedA.urls }) });
    const t1 = await r1.text();
    const r2 = await fetch(`${base}/api/transcribe`, { method: "POST", headers: { ...headersBase(jobB), ...payHeaders }, body: JSON.stringify({ jobId: jobB, chunks: hostedB.urls }) });
    const t2 = await r2.text();
    const resp2 = r2.headers.get("payment-response");
    const decoded2 = resp2 ? JSON.parse(Buffer.from(resp2, "base64").toString()) : null;
    const refused = r2.status !== 200;
    save("B3", {
      title: "the same signed payment sent twice",
      result: refused ? `first request ${r1.status} (paid and delivered); the replay was refused with HTTP ${r2.status}` : "UNEXPECTED: the replay was accepted",
      firstStatus: r1.status, replayStatus: r2.status,
      firstPaymentResponse: JSON.parse(Buffer.from(r1.headers.get("payment-response") ?? "e30=", "base64").toString()),
      replayPaymentResponse: decoded2, replayBody: t2.slice(0, 400), firstBody: t1.slice(0, 120),
      note: "the replay used a different job id, so the refusal is not our job guard",
    });
  } finally { hostedA.close(); hostedB.close(); }
}

async function main() {
  const which = (process.argv[2] ?? "").toUpperCase();
  const base = (arg("base") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (which === "B1") return b1(base);
  if (which === "B2") return b2(base);
  if (which === "B3") return b3(base);
  if (which === "B4") return b4();
  console.error(`${which || "(none)"} is not automated here. Implemented: B1, B2, B4. Record the others manually into runs/break/ with the same shape.`);
  process.exit(2);
}
main().catch((e) => { console.error(e); process.exit(1); });
