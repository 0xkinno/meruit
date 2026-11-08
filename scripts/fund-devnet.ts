/**
 * Moves devnet USDC from the devnet sponsor to another wallet (default: the buyer test wallet).
 * Usage: tsx scripts/fund-devnet.ts <recipientAddress> <amountUsdc>   e.g. 8 or 0.5
 * Devnet only. Refuses to run when NEXT_PUBLIC_NETWORK is mainnet and no explicit --force-devnet is given
 * so that a mainnet RPC can never be used by mistake.
 */
import { base58 } from "@scure/base";
import { address, createKeyPairSignerFromBytes } from "@solana/kit";
import { findAssociatedTokenPda, getCreateAssociatedTokenIdempotentInstruction, getTransferCheckedInstruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { need } from "./lib/env";
import { sendInstructions } from "../lib/solana/send";
import { USDC_DEVNET } from "../lib/channels/constants";

const RPC = process.env.SOLANA_RPC_DEVNET || "https://api.devnet.solana.com";

async function main() {
  const to = process.argv[2];
  const amt = process.argv[3];
  if (!to || !amt || !/^\d+(\.\d{1,6})?$/.test(amt)) { console.error("usage: tsx scripts/fund-devnet.ts <recipient> <amountUsdc>"); process.exit(2); }
  const [w, f = ""] = amt.split(".");
  const atomic = BigInt(w) * 1_000_000n + BigInt((f + "000000").slice(0, 6));
  const sponsor = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_DEVNET_SPONSOR_KEY")));
  const mint = address(USDC_DEVNET);
  const [src] = await findAssociatedTokenPda({ owner: sponsor.address, mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  const [dst] = await findAssociatedTokenPda({ owner: address(to), mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  const sig = await sendInstructions(sponsor, [
    getCreateAssociatedTokenIdempotentInstruction({ payer: sponsor, ata: dst, owner: address(to), mint }),
    getTransferCheckedInstruction({ source: src, mint, destination: dst, authority: sponsor, amount: atomic, decimals: 6 }),
  ], RPC);
  console.log(`sent ${amt} devnet USDC to ${to}\nsignature ${sig}\nhttps://explorer.solana.com/tx/${sig}?cluster=devnet`);
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
