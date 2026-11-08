/**
 * B9, measured: the same `open` instruction sent twice on devnet, once with a salt ground so the channel PDA and the escrow ATA
 * both land on bump 255, once with a salt that does not. Everything else is identical (payer, payee, mint, deposit, grace).
 * Records the compute units consumed by each transaction. Devnet only; the channels are recovered afterwards with scripts/rescue.ts.
 */
import { base58 } from "@scure/base";
import {
  address, appendTransactionMessageInstructions, createKeyPairSignerFromBytes, createSolanaRpc, createTransactionMessage, getBase64EncodedWireTransaction,
  getSignatureFromTransaction, pipe, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners,
} from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { mkdirSync, writeFileSync } from "node:fs";
import { need, network, rpcUrl } from "./lib/env";
import { getOpenInstructionAsync } from "../lib/channels/generated/instructions/open";
import { deriveChannel, grindSalt, savedComputeUnits } from "../lib/channels/salt";
import { USDC_DEVNET } from "../lib/channels/constants";

async function main() {
  if (network() !== "devnet") { console.error("devnet only: set NEXT_PUBLIC_NETWORK=devnet"); process.exit(2); }
  const buyer = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_BUYER_TEST_KEY")));
  const feePayer = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_FEE_PAYER_KEY")));
  const authorizer = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_RECEIVER_AUTHORIZER_KEY")));
  const rpc = createSolanaRpc(rpcUrl());
  const mint = address(USDC_DEVNET);
  const [payerAta] = await findAssociatedTokenPda({ owner: buyer.address, mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });

  async function openWith(label: string, pickSalt: (seed: Parameters<typeof deriveChannel>[0]) => Promise<bigint>) {
    const slot = await rpc.getSlot().send();
    const seed = { payer: buyer.address, payee: feePayer.address, mint, authorizedSigner: authorizer.address, openSlot: slot };
    const salt = await pickSalt(seed);
    const d = await deriveChannel(seed, salt);
    const ix = await getOpenInstructionAsync({
      payer: buyer, rentPayer: feePayer, payee: feePayer.address, mint, authorizedSigner: authorizer.address, channel: d.channel,
      payerTokenAccount: payerAta, channelTokenAccount: d.escrow, tokenProgram: TOKEN_PROGRAM_ADDRESS,
      rent: address("SysvarRent111111111111111111111111111111111"), associatedTokenProgram: address("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
      openArgs: { salt, deposit: 10000n, gracePeriod: 60, openSlot: slot, recipients: [{ recipient: address(need("MERUIT_PAY_TO")), bps: 10000 }] },
    });
    const { value: bh } = await rpc.getLatestBlockhash().send();
    const msg = pipe(createTransactionMessage({ version: 0 }), (m) => setTransactionMessageFeePayerSigner(feePayer, m), (m) => setTransactionMessageLifetimeUsingBlockhash(bh, m), (m) => appendTransactionMessageInstructions([ix], m));
    const tx = await signTransactionMessageWithSigners(msg);
    const wire = getBase64EncodedWireTransaction(tx);
    const sig = getSignatureFromTransaction(tx);
    await rpc.sendTransaction(wire, { encoding: "base64", preflightCommitment: "confirmed" }).send();
    let cu: number | null = null;
    for (let i = 0; i < 40 && cu === null; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const t = await rpc.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed", encoding: "json" }).send();
      if (t) { if (t.meta?.err) throw new Error(`${label}: ${JSON.stringify(t.meta.err, (_, v) => (typeof v === "bigint" ? v.toString() : v))}`); cu = Number(t.meta?.computeUnitsConsumed ?? 0); }
    }
    console.log(`${label}: bumps ${d.channelBump}/${d.escrowBump}, ${cu} CU, ${sig}`);
    return { label, salt: salt.toString(), channelBump: d.channelBump, escrowBump: d.escrowBump, computeUnits: cu, signature: sig, channel: d.channel };
  }

  const ground = await openWith("ground (255/255)", async (seed) => (await grindSalt(seed, BigInt(Date.now()))).salt);
  const plain = await openWith("not ground", async (seed) => {
    let best = { salt: 1n, loss: -1 };
    for (let i = 0; i < 200; i++) {
      const salt = BigInt(Date.now()) + BigInt(i);
      const d = await deriveChannel(seed, salt);
      const loss = (255 - d.channelBump) + (255 - d.escrowBump);
      if (loss > best.loss) best = { salt, loss };
    }
    return best.salt;
  });
  const delta = (plain.computeUnits ?? 0) - (ground.computeUnits ?? 0);
  const out = {
    id: "B9", network: "devnet", at: new Date().toISOString(), title: "salt grinding to bump 255, same open instruction sent twice",
    result: `ground salt: ${ground.computeUnits} CU; non-ground salt (bumps ${plain.channelBump}/${plain.escrowBump}): ${plain.computeUnits} CU; difference ${delta} CU; documented model predicts ${savedComputeUnits(plain.channelBump, plain.escrowBump)} CU`,
    ground, plain, differenceCu: delta, modelPredictedCu: savedComputeUnits(plain.channelBump, plain.escrowBump),
    note: "single pair of transactions, not a distribution; CU can also vary with account state. Recover the two 10,000 atomic deposits with scripts/rescue.ts.",
  };
  mkdirSync("runs/break", { recursive: true });
  writeFileSync("runs/break/B9-with-without-devnet.json", JSON.stringify(out, null, 2) + "\n");
  console.log(out.result);
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
