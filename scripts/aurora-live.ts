/**
 * Live Aurora runs with the buyer test wallet on mainnet. Real funds, small amounts.
 *   tsx scripts/aurora-live.ts exit  <amountUsdc>        Solana USDC -> Base USDC through the Swap API (live exit)
 *   tsx scripts/aurora-live.ts short <quotedUsdc> <sendUsdc>   B6: quote one amount, send less, record the refund path
 *   tsx scripts/aurora-live.ts dry   <amountUsdc>        quote only
 * The Base recipient is a throwaway address generated once and kept in .secrets/base-test.json (git-ignored).
 */
import { base58 } from "@scure/base";
import { address, createKeyPairSignerFromBytes } from "@solana/kit";
import { findAssociatedTokenPda, getCreateAssociatedTokenIdempotentInstruction, getTransferCheckedInstruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { need, rpcUrl } from "./lib/env";
import { sendInstructions } from "../lib/solana/send";
import { quote, submitDeposit, swapStatus } from "../lib/aurora/swap";
import { ASSETS } from "../lib/aurora/assets";
import { USDC_MAINNET } from "../lib/channels/constants";

const atomic = (v: string) => { const [w, f = ""] = v.split("."); return BigInt(w) * 1_000_000n + BigInt((f + "000000").slice(0, 6)); };

function baseWallet() {
  const f = ".secrets/base-test.json";
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8")) as { address: string };
  const priv = randomBytes(32);
  const pub = secp256k1.getPublicKey(priv, false).slice(1);
  const addr = "0x" + Buffer.from(keccak_256(pub).slice(-20)).toString("hex");
  mkdirSync(".secrets", { recursive: true });
  writeFileSync(f, JSON.stringify({ address: addr, privateKey: Buffer.from(priv).toString("hex") }) + "\n");
  chmodSync(f, 0o600);
  return { address: addr };
}

async function main() {
  const [mode, a1, a2] = [process.argv[2], process.argv[3], process.argv[4]];
  const buyer = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_BUYER_TEST_KEY")));
  const evm = baseWallet();
  const quotedAtomic = atomic(a1 ?? "0.5");
  const recipient = evm.address;

  if (mode === "dry") {
    const q = await quote({ dry: true, originAsset: ASSETS.solUsdc, destinationAsset: ASSETS.baseUsdc, amount: quotedAtomic.toString(), recipient, refundTo: buyer.address });
    console.log(JSON.stringify(q.quote, null, 1));
    return;
  }
  const sendAtomic = mode === "short" ? atomic(a2 ?? "0.05") : quotedAtomic;
  const deadlineMin = mode === "short" ? 6 : 30;
  const started = Date.now();
  const q = await quote({
    dry: false, originAsset: ASSETS.solUsdc, destinationAsset: ASSETS.baseUsdc, amount: quotedAtomic.toString(), recipient, refundTo: buyer.address,
    deadline: new Date(Date.now() + deadlineMin * 60_000).toISOString(),
  });
  const dep = q.quote.depositAddress;
  if (!dep) throw new Error("no deposit address returned");
  console.log(`quote ok: in ${q.quote.amountInFormatted}, out ${q.quote.amountOutFormatted} on Base, deposit address ${dep.slice(0, 8)}...`);

  const mint = address(USDC_MAINNET);
  const [src] = await findAssociatedTokenPda({ owner: buyer.address, mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  const [dst] = await findAssociatedTokenPda({ owner: address(dep), mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  const sig = await sendInstructions(buyer, [
    getCreateAssociatedTokenIdempotentInstruction({ payer: buyer, ata: dst, owner: address(dep), mint }),
    getTransferCheckedInstruction({ source: src, mint, destination: dst, authority: buyer, amount: sendAtomic, decimals: 6 }),
  ], rpcUrl());
  console.log(`sent ${sendAtomic} atomic USDC, signature ${sig}`);
  await submitDeposit({ txHash: sig, depositAddress: dep }).catch((e) => console.log("submit note:", (e as Error).message));

  const timeline: { at: string; status: string }[] = [];
  let last = "";
  let final = "";
  const limitMs = (mode === "short" ? 20 : 12) * 60_000;
  while (Date.now() - started < limitMs) {
    const s = await swapStatus(dep).catch(() => null);
    if (s && s.status !== last) { last = s.status; timeline.push({ at: new Date().toISOString(), status: s.status }); console.log(`${((Date.now() - started) / 60000).toFixed(1)} min: ${s.status}`); }
    if (s && ["SUCCESS", "REFUNDED", "FAILED"].includes(s.status)) { final = s.status; break; }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  const last_ = await swapStatus(dep).catch(() => null);
  const details = (last_?.swapDetails ?? {}) as Record<string, unknown>;
  mkdirSync("runs/break", { recursive: true });
  const id = mode === "short" ? "B6" : "aurora-exit";
  writeFileSync(`runs/break/${id}-mainnet.json`, JSON.stringify({
    id, network: "mainnet", at: new Date().toISOString(), title: mode === "short" ? "short deposit forces a refund" : "exit Solana USDC to Base USDC through the Swap API",
    quotedAtomic: quotedAtomic.toString(), sentAtomic: sendAtomic.toString(), recipient: `Base ${recipient}`, refundTo: buyer.address,
    quote: { amountIn: q.quote.amountInFormatted, amountOut: q.quote.amountOutFormatted }, depositSignature: sig, finalStatus: final || last || "no terminal state within the wait",
    minutes: Number(((Date.now() - started) / 60000).toFixed(1)), timeline, swapDetails: details,
  }, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2) + "\n");
  console.log("final:", final || last || "not terminal yet");
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
