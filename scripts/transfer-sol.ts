/**
 * Moves a small amount of SOL between the project's own test wallets.
 * Usage: tsx scripts/transfer-sol.ts <from: fee|buyer|sponsor> <toAddress> <lamports>
 * Uses the configured network. Refuses amounts above 0.01 SOL (10,000,000 lamports).
 */
import { base58 } from "@scure/base";
import { address, createKeyPairSignerFromBytes } from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { need, rpcUrl } from "./lib/env";
import { sendInstructions } from "../lib/solana/send";

const KEYS: Record<string, string> = { fee: "MERUIT_FEE_PAYER_KEY", buyer: "MERUIT_BUYER_TEST_KEY", sponsor: "MERUIT_DEVNET_SPONSOR_KEY" };

async function main() {
  const [from, to, amt] = process.argv.slice(2);
  if (!KEYS[from] || !to || !/^\d+$/.test(amt ?? "")) { console.error("usage: tsx scripts/transfer-sol.ts <fee|buyer|sponsor> <toAddress> <lamports>"); process.exit(2); }
  const lamports = BigInt(amt);
  if (lamports > 10_000_000n) { console.error("refusing: above 0.01 SOL"); process.exit(2); }
  const signer = await createKeyPairSignerFromBytes(base58.decode(need(KEYS[from])));
  const sig = await sendInstructions(signer, [getTransferSolInstruction({ source: signer, destination: address(to), amount: lamports })], rpcUrl());
  console.log(`sent ${lamports} lamports from ${from} to ${to}\nsignature ${sig}`);
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
