/**
 * Live Intents Connect bridge-in from the Base test wallet to the buyer's Solana wallet (one signature on Base).
 *   tsx scripts/connect-live.ts dry [amountAtomic]     validate the steps and show the quote, nothing committed
 *   tsx scripts/connect-live.ts run [amountAtomic]     create, sign, submit, deposit on Base, then wait for Solana
 * The steps run from the wallet's Solana intermediary: create the buyer's USDC account if missing, then a checked
 * USDC transfer of the bridged amount to the buyer. Real funds on Base mainnet, small amounts.
 * Writes runs/break/connect-bridge-in-mainnet.json (also the Base to Solana data point for B7).
 */
import { address, createSolanaRpc } from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { rpcUrl } from "./lib/env";
import { createBridgeIn, getIntermediary, submitDepositHash, submitSignature, listExecutions } from "../lib/aurora/connectRest";
import { buildBridgeInBody, secp256k1Envelope } from "../lib/aurora/connectSteps";
import { USDC_MAINNET } from "../lib/channels/constants";

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const BUYER = "2nzqHcYzmi1PPjAbpzKfyaMvP1Y4x2zCzDfMCt3f5uAF";

async function main() {
  const mode = process.argv[2] ?? "dry";
  const amount = process.argv[3] ?? "497448";
  const wallet = JSON.parse(readFileSync(".secrets/base-test.json", "utf8")) as { address: string; privateKey: string };
  const account = privateKeyToAccount(`0x${wallet.privateKey}` as `0x${string}`);
  const im = await getIntermediary(account.address);
  if (!im.solana) throw new Error("Solana destinations are not enabled for this wallet");

  const body = await buildBridgeInBody({ intermediarySolana: im.solana, buyer: BUYER, amountAtomic: amount });
  const mint = address(USDC_MAINNET);
  const [buyerAta] = await findAssociatedTokenPda({ owner: address(BUYER), mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });

  if (mode === "dry") {
    const r = await createBridgeIn(account.address, { ...body, dry: true });
    console.log(JSON.stringify({ intermediary: im.solana, networkFee: (r.result.details as { networkFee?: string })?.networkFee, quote: (r.result as { quote?: unknown }).quote }, null, 1).slice(0, 1400));
    return;
  }

  const t0 = Date.now();
  const sol = createSolanaRpc(rpcUrl());
  const buyerBefore = BigInt((await sol.getTokenAccountBalance(buyerAta).send().catch(() => ({ value: { amount: "0" } }))).value.amount);
  const created = (await createBridgeIn(account.address, { ...body, dry: false })).result as Record<string, any>;
  const details = created.details as Record<string, any>;
  const executionId = String(created.id ?? created.executionId ?? details.executionId);
  const depositAddress = String(created.quote?.depositAddress ?? details.depositAddress);
  // erc191: personal_sign over details.payload.payload_json verbatim, recovery byte 27/28 -> 0/1, base58, "secp256k1:" prefix.
  const toSign = String(details.payload?.payload_json ?? details.messageToSign);
  mkdirSync(".secrets", { recursive: true });
  writeFileSync(".secrets/connect-last.json", JSON.stringify({ executionId, depositAddress, at: new Date().toISOString() }));
  console.log(`created execution ${executionId.slice(0, 12)}..., signing standard ${details.signingStandard}, deposit address ${depositAddress.slice(0, 8)}...`);

  const signature = secp256k1Envelope(await account.signMessage({ message: toSign }));
  await submitSignature(account.address, { signature, executionId });
  console.log("signature submitted");

  const pub = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });
  const wal = createWalletClient({ account, chain: base, transport: http("https://mainnet.base.org") });
  const depositAmount = BigInt(created.quote?.amountIn ?? amount);
  const txHash = await wal.writeContract({ address: BASE_USDC, abi: parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]), functionName: "transfer", args: [depositAddress as `0x${string}`, depositAmount] });
  const sent = Date.now();
  await pub.waitForTransactionReceipt({ hash: txHash });
  console.log(`deposit sent on Base: ${txHash}`);
  await submitDepositHash({ txHash, depositAddress }).catch((e) => console.log("deposit hash note:", (e as Error).message));

  let arrivedAt: number | null = null;
  let last = "";
  const timeline: { at: string; status: string }[] = [];
  while (Date.now() - sent < 20 * 60_000) {
    const execs = (await listExecutions(account.address).catch(() => null)) as { result?: Record<string, any>[] } | null;
    const mine = execs?.result?.find((x) => String(x.id ?? x.executionId) === executionId);
    const st = String(mine?.status ?? "");
    if (st && st !== last) { last = st; timeline.push({ at: new Date().toISOString(), status: st }); console.log(`${((Date.now() - sent) / 60000).toFixed(1)} min: ${st}`); }
    const now = BigInt((await sol.getTokenAccountBalance(buyerAta).send().catch(() => ({ value: { amount: "0" } }))).value.amount);
    if (now > buyerBefore) { arrivedAt = Date.now(); break; }
    if (["FAILED", "REFUNDED", "CANCELLED"].includes(st)) break;
    await new Promise((r) => setTimeout(r, 10_000));
  }
  const buyerAfter = BigInt((await sol.getTokenAccountBalance(buyerAta).send().catch(() => ({ value: { amount: "0" } }))).value.amount);
  const final = (await listExecutions(account.address).catch(() => null)) as { result?: Record<string, any>[] } | null;
  const mine = final?.result?.find((x) => String(x.id ?? x.executionId) === executionId);
  const out = {
    id: "connect-bridge-in", network: "mainnet", at: new Date().toISOString(), title: "Intents Connect bridge-in from Base to the buyer's Solana wallet, one signature",
    originWallet: account.address, intermediarySolana: im.solana, executionId, depositAddress, originTxHash: txHash, depositedAtomic: depositAmount.toString(),
    buyerUsdcBefore: buyerBefore.toString(), buyerUsdcAfter: buyerAfter.toString(), arrivedAtomic: (buyerAfter - buyerBefore).toString(),
    minutesFromDepositToArrival: arrivedAt ? Number(((arrivedAt - sent) / 60000).toFixed(2)) : null, minutesTotal: Number(((Date.now() - t0) / 60000).toFixed(2)),
    finalStatus: arrivedAt ? "arrived" : last || "not terminal", timeline, execution: mine ?? null,
    slotsEquivalent: arrivedAt ? Math.round(((arrivedAt - sent) / 1000) / 0.4) : null,
  };
  mkdirSync("runs/break", { recursive: true });
  writeFileSync("runs/break/connect-bridge-in-mainnet.json", JSON.stringify(out, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2) + "\n");
  console.log(JSON.stringify({ ...out, execution: undefined }, null, 1));
}
main().catch((e) => { console.error(e.message ?? e, e.body ? JSON.stringify(e.body).slice(0, 400) : ""); process.exit(1); });
