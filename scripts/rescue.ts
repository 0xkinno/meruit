/**
 * Buyer-side recovery from the command line, the same steps the /rescue page runs from a wallet:
 * request_close, wait out the grace period, seal, withdraw_payer, for every channel the buyer test key still has open.
 * Usage: tsx scripts/rescue.ts            (uses MERUIT_BUYER_TEST_KEY on the configured network)
 */
import { base58 } from "@scure/base";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { mkdirSync, writeFileSync } from "node:fs";
import { need, network, rpcUrl } from "./lib/env";
import { findChannelsByPayer } from "../lib/channels/discover";
import { escapeInstruction, nextEscapeStep, readChannel, rpcFor } from "../lib/channels/escape";
import { sendInstructions } from "../lib/solana/send";

async function main() {
  const buyer = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_BUYER_TEST_KEY")));
  const rpc = rpcFor(rpcUrl());
  const open = (await findChannelsByPayer(rpc, buyer.address)).filter((c) => c.status !== "distributed" && !(c.status === "sealed" && c.payerWithdrawnAt > 0n));
  console.log(`${open.length} channel(s) to recover on ${network()}`);
  for (const ch of open) {
    const sigs: Record<string, string> = {};
    const t0 = Date.now();
    for (let guard = 0; guard < 8; guard++) {
      const v = await readChannel(rpc, ch.id);
      const step = nextEscapeStep(v, Math.floor(Date.now() / 1000));
      if (step.kind === "wait") { console.log(`${ch.id.slice(0, 8)} waiting ${step.secondsLeft}s`); await new Promise((r) => setTimeout(r, (step.secondsLeft + 3) * 1000)); continue; }
      if (step.kind === "done" || step.kind === "missing") break;
      sigs[step.kind] = await sendInstructions(buyer, [await escapeInstruction(step, buyer, v!)], rpcUrl());
      console.log(step.kind, sigs[step.kind]);
    }
    mkdirSync("runs/break", { recursive: true });
    writeFileSync(`runs/break/rescue-${ch.id.slice(0, 8)}.json`, JSON.stringify({ id: `rescue-${ch.id.slice(0, 8)}`, network: network(), channel: ch.id, depositAtomic: ch.deposit.toString(), elapsedSeconds: Math.round((Date.now() - t0) / 1000), signatures: sigs, at: new Date().toISOString() }, null, 2) + "\n");
  }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
