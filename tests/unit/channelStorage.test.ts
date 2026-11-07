import { describe, it, expect } from "vitest";
import { RedisPaymentChannelStorage } from "@/lib/x402/redisChannelStorage";
import { __memoryKV } from "@/lib/store";

const NET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" as never;
const rec = (over = {}) => ({ network: NET, channelId: "C1", payTo: "P", tokenProgram: "T", expiresAt: 100, lastActivityAt: 10, receiverAuthorizer: "", callerIdentity: "", ...over });

describe("RedisPaymentChannelStorage", () => {
  it("first recordOpen inserts with a revert token, second does not", async () => {
    const s = new RedisPaymentChannelStorage(() => kv);
    const kv = __memoryKV();
    const a = await s.recordOpen(rec());
    expect(a.revertToken).not.toBe("");
    const b = await s.recordOpen(rec({ expiresAt: 200 }));
    expect(b.revertToken).toBe("");
    expect(b.record.expiresAt).toBe(200);
    await s.revertOpen(a); // token rotated: no-op
    expect(await s.get(NET, "C1")).toBeDefined();
  });
  it("concurrent opens: exactly one creator", async () => {
    const kv = __memoryKV();
    const s = new RedisPaymentChannelStorage(() => kv);
    const r = await Promise.all([s.recordOpen(rec()), s.recordOpen(rec()), s.recordOpen(rec())]);
    expect(r.filter((x) => x.revertToken !== "").length).toBe(1);
  });
  it("conflicting binding leaves the row unchanged", async () => {
    const kv = __memoryKV();
    const s = new RedisPaymentChannelStorage(() => kv);
    await s.recordOpen(rec({ callerIdentity: "alice" }));
    const c = await s.recordOpen(rec({ callerIdentity: "mallory", expiresAt: 999 }));
    expect(c.revertToken).toBe("");
    expect(c.record.callerIdentity).toBe("alice");
    expect(c.record.expiresAt).toBe(100);
  });
  it("revert removes the row when the token still matches; activity never moves backwards", async () => {
    const kv = __memoryKV();
    const s = new RedisPaymentChannelStorage(() => kv);
    const w = await s.recordOpen(rec());
    await s.recordActivity(rec({ lastActivityAt: 5, expiresAt: 1 }));
    expect((await s.get(NET, "C1"))!.lastActivityAt).toBe(10);
    await s.revertOpen(w);
    expect(await s.get(NET, "C1")).toBeUndefined();
  });
  it("list and delete", async () => {
    const kv = __memoryKV();
    const s = new RedisPaymentChannelStorage(() => kv);
    await s.recordOpen(rec({ channelId: "A" }));
    await s.recordOpen(rec({ channelId: "B" }));
    expect((await s.list(NET)).length).toBe(2);
    await s.delete(NET, "A");
    expect((await s.list(NET)).map((r) => r.channelId)).toEqual(["B"]);
  });
});
