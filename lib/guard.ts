// Public spending locks: kill switch, per-job cap (in meter.ts) and per-wallet daily cap.
import { getKV, type KV } from "./store";

export const liveOn = () => (process.env.MERUIT_LIVE ?? "on").toLowerCase() !== "off";
export const walletDayCap = () => BigInt(process.env.MERUIT_MAX_WALLET_DAY_ATOMIC || "1000000");
const day = () => new Date().toISOString().slice(0, 10);

/** Reserve `amount` against a wallet's daily cap. Returns false when it would exceed the cap. */
export async function reserveDaily(wallet: string, amount: bigint, kv: KV = getKV()): Promise<boolean> {
  const k = `meruit:day:${day()}:${wallet}`;
  const total = await kv.incrBy(k, parseInt(amount.toString(), 10), 172800);
  if (BigInt(total) > walletDayCap()) { await kv.incrBy(k, -parseInt(amount.toString(), 10)); return false; }
  return true;
}
export async function releaseDaily(wallet: string, amount: bigint, kv: KV = getKV()) {
  await kv.incrBy(`meruit:day:${day()}:${wallet}`, -parseInt(amount.toString(), 10));
}
