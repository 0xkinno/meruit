/**
 * Records the transaction engineering of any signature: instruction count, serialized bytes (of 1,232),
 * compute units, fee, accounts. Usage: tsx scripts/record-tx.ts <signature> [--out runs/tx]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { rpcUrl, network } from "./lib/env";

const PROGRAM = "CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX";
const NAMES: Record<number, string> = { 1: "open", 2: "settle", 3: "topUp", 4: "settleAndSeal", 5: "requestClose", 6: "seal", 7: "distribute", 8: "withdrawPayer", 9: "reclaim" };

export async function recordTx(sig: string, out = "runs/tx") {
  const r = await fetch(rpcUrl(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction", params: [sig, { maxSupportedTransactionVersion: 0, encoding: "base64", commitment: "confirmed" }] }) });
  const j = (await r.json()) as { result?: any; error?: unknown };
  if (!j.result) throw new Error(`transaction not found: ${JSON.stringify(j.error ?? null)}`);
  const raw = Buffer.from(j.result.transaction[0], "base64");
  const parsed = await (await fetch(rpcUrl(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "getTransaction", params: [sig, { maxSupportedTransactionVersion: 0, encoding: "json", commitment: "confirmed" }] }) })).json() as { result: any };
  const msg = parsed.result.transaction.message;
  const keys: string[] = [...msg.accountKeys, ...(parsed.result.meta?.loadedAddresses?.writable ?? []), ...(parsed.result.meta?.loadedAddresses?.readonly ?? [])];
  const base58 = (await import("@scure/base")).base58;
  const ixs = (msg.instructions as { programIdIndex: number; data: string }[]).map((ix) => {
    const program = keys[ix.programIdIndex];
    const data = base58.decode(ix.data);
    return { program, name: program === PROGRAM ? NAMES[data[0]] ?? `disc_${data[0]}` : program.slice(0, 8) };
  });
  const rec = {
    signature: sig, network: network(), slot: j.result.slot, blockTime: j.result.blockTime, err: j.result.meta?.err ?? null,
    instructionCount: ixs.length, instructions: ixs, serializedBytes: raw.length, limitBytes: 1232,
    computeUnitsConsumed: j.result.meta?.computeUnitsConsumed ?? null, feeLamports: j.result.meta?.fee ?? null,
    accountCount: keys.length, usesLookupTables: (msg.addressTableLookups?.length ?? 0) > 0,
  };
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${sig.slice(0, 16)}.json`, JSON.stringify(rec, null, 2) + "\n");
  return rec;
}

if (process.argv[1]?.endsWith("record-tx.ts")) {
  const sig = process.argv[2];
  if (!sig) { console.error("usage: tsx scripts/record-tx.ts <signature>"); process.exit(2); }
  recordTx(sig).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e.message); process.exit(1); });
}
