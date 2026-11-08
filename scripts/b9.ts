/**
 * B9: salt grinding. For every channel the buyer test key opened through the SDK (which picks its own salt),
 * read the real channel account, recompute its PDA and escrow ATA bumps, and report the compute units that
 * grinding to bump 255 would have saved under the program docs' cost model (about 1,500 CU per bump step below
 * 255, per derivation, in open, topUp, distribute and withdrawPayer). Measured CU per instruction comes from
 * scripts/record-tx.ts. Writes runs/break/B9-<network>.json.
 */
import { base58 } from "@scure/base";
import { createKeyPairSignerFromBytes, address, getAddressDecoder, getAddressEncoder, type Address } from "@solana/kit";
import { getChannelDecoder } from "../lib/channels/generated/accounts/channel";
import { findChannelsByPayer } from "../lib/channels/discover";
import { deriveChannel, grindSalt, savedComputeUnits } from "../lib/channels/salt";
import { rpcFor } from "../lib/channels/escape";
import { need, network, rpcUrl } from "./lib/env";
import { mkdirSync, writeFileSync } from "node:fs";

async function main() {
  const buyer = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_BUYER_TEST_KEY")));
  const rpc = rpcFor(rpcUrl());
  const views = await findChannelsByPayer(rpc, buyer.address);
  const decoder = getChannelDecoder();
  void getAddressDecoder; void getAddressEncoder;
  const rows = [];
  for (const v of views) {
    const acct = await rpc.getAccountInfo(address(v.id), { encoding: "base64" }).send();
    if (!acct.value) continue;
    const raw = Uint8Array.from(atob(acct.value.data[0]), (c) => c.charCodeAt(0));
    const c = decoder.decode(raw);
    const d = await deriveChannel({ payer: c.payer, payee: c.payee, mint: c.mint, authorizedSigner: c.authorizedSigner, openSlot: c.openSlot }, c.salt);
    rows.push({ channel: v.id, salt: c.salt.toString(), channelBump: d.channelBump, escrowBump: d.escrowBump, derivedMatchesAccount: d.channel === (v.id as Address), estimatedCuSavedPerInstruction: savedComputeUnits(d.channelBump, d.escrowBump) });
  }
  const ground = await grindSalt({ payer: buyer.address, payee: buyer.address, mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", authorizedSigner: buyer.address, openSlot: 1n }, 1n);
  const notAt255 = rows.filter((r) => r.channelBump !== 255 || r.escrowBump !== 255).length;
  const out = {
    id: "B9", network: network(), at: new Date().toISOString(), title: "salt grinding to bump 255",
    result: `${notAt255} of ${rows.length} SDK-opened channels were not at bump 255 for both addresses; grinding found a salt at 255 for both in ${ground.tries} tries`,
    method: "bumps recomputed from real channel accounts; saving is the documented cost model, not a measured before/after of the same instruction",
    channels: rows, grindExample: { tries: ground.tries },
    note: "The x402 SDK client chooses the salt itself, so Meruit cannot grind the salt of the opens it sends through the SDK. A measured with/without comparison needs Meruit to build its own open.",
  };
  mkdirSync("runs/break", { recursive: true });
  writeFileSync(`runs/break/B9-${network()}.json`, JSON.stringify(out, null, 2) + "\n");
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
