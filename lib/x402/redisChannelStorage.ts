import type { Network } from "@x402/core/types";
import type { PaymentChannelStorage, PaymentChannelRecord, PaymentChannelOpenWrite } from "@x402/svm/upto/facilitator";
import { getKV, type KV } from "../store";

const key = (network: string) => `meruit:channels:${network}`;

/**
 * Durable PaymentChannelStorage on Redis hashes. `recordOpen` uses HSETNX so the absent-row check
 * and insert are one atomic operation, as the SDK requires.
 */
export class RedisPaymentChannelStorage implements PaymentChannelStorage {
  private n = 0;
  constructor(private kv: () => KV = getKV) {}

  private token() { return `${Date.now().toString(36)}-${(this.n++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

  async recordOpen(record: PaymentChannelRecord): Promise<PaymentChannelOpenWrite> {
    const kv = this.kv();
    const k = key(record.network);
    const revertToken = this.token();
    const row = { record, revertToken };
    const inserted = await kv.hsetnx(k, record.channelId, row);
    if (inserted) return { record, revertToken };

    const existing = (await kv.hgetall<{ record: PaymentChannelRecord; revertToken: string }>(k))[record.channelId];
    const cur = existing.record;
    const conflict =
      (record.callerIdentity && cur.callerIdentity && record.callerIdentity !== cur.callerIdentity) ||
      (record.receiverAuthorizer && cur.receiverAuthorizer && record.receiverAuthorizer !== cur.receiverAuthorizer);
    if (conflict) return { record: cur, revertToken: "" };
    const merged: PaymentChannelRecord = {
      ...cur,
      expiresAt: Math.max(cur.expiresAt, record.expiresAt),
      lastActivityAt: Math.max(cur.lastActivityAt, record.lastActivityAt),
    };
    // A non-conflicting reopen rotates the stored token so the creator's later revert no longer matches.
    await kv.hset(k, record.channelId, { record: merged, revertToken: this.token() });
    return { record: merged, revertToken: "" };
  }

  async revertOpen(write: PaymentChannelOpenWrite): Promise<void> {
    if (!write.revertToken) return;
    const kv = this.kv();
    const k = key(write.record.network);
    const row = (await kv.hgetall<{ record: PaymentChannelRecord; revertToken: string }>(k))[write.record.channelId];
    if (row && row.revertToken === write.revertToken) await kv.hdel(k, write.record.channelId);
  }

  async recordActivity(...records: PaymentChannelRecord[]): Promise<void> {
    const kv = this.kv();
    for (const r of records) {
      const k = key(r.network);
      const row = (await kv.hgetall<{ record: PaymentChannelRecord; revertToken: string }>(k))[r.channelId];
      if (!row) { await kv.hsetnx(k, r.channelId, { record: r, revertToken: "" }); continue; }
      await kv.hset(k, r.channelId, {
        ...row,
        record: { ...row.record, expiresAt: Math.max(row.record.expiresAt, r.expiresAt), lastActivityAt: Math.max(row.record.lastActivityAt, r.lastActivityAt) },
      });
    }
  }

  async get(network: Network, channelId: string) {
    const row = (await this.kv().hgetall<{ record: PaymentChannelRecord }>(key(network)))[channelId];
    return row?.record;
  }

  async list(network: Network) {
    return Object.values(await this.kv().hgetall<{ record: PaymentChannelRecord }>(key(network))).map((r) => r.record);
  }

  async delete(network: Network, channelId: string) {
    await this.kv().hdel(key(network), channelId);
  }
}
