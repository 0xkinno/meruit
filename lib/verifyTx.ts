import { createSolanaRpc } from "@solana/kit";
import { rpcUrl } from "./x402/server";
import { PAYMENT_CHANNELS_PROGRAM } from "./channels/constants";

export type TxCheck = { ok: true; slot: string } | { ok: false; reason: string };

/** True only for a confirmed, successful transaction that invokes the payment-channels program. */
export async function verifyChannelTx(signature: string): Promise<TxCheck> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) return { ok: false, reason: "bad_signature_format" };
  const rpc = createSolanaRpc(rpcUrl());
  const tx = await rpc.getTransaction(signature as never, { maxSupportedTransactionVersion: 1 as never, encoding: "json", commitment: "confirmed" }).send();
  if (!tx) return { ok: false, reason: "not_found" };
  if (tx.meta?.err) return { ok: false, reason: "transaction_failed" };
  const keys = (tx.transaction.message as unknown as { accountKeys: readonly string[] }).accountKeys.map(String);
  const loaded = tx.meta?.loadedAddresses ? [...tx.meta.loadedAddresses.writable, ...tx.meta.loadedAddresses.readonly].map(String) : [];
  if (![...keys, ...loaded].includes(PAYMENT_CHANNELS_PROGRAM)) return { ok: false, reason: "not_a_payment_channels_transaction" };
  return { ok: true, slot: String(tx.slot) };
}
