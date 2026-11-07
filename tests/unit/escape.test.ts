import { describe, it, expect } from "vitest";
import { nextEscapeStep, humanStep, type ChannelView } from "@/lib/channels/escape";
import { grindSalt, deriveChannel, savedComputeUnits } from "@/lib/channels/salt";

const base: ChannelView = { id: "C", status: "open", deposit: 120000n, settled: 0n, refundable: 120000n, closureStartedAt: 0n, gracePeriod: 900, payerWithdrawnAt: 0n, payer: "P", payee: "Q", mint: "M", openSlot: 1n };

describe("escape planner", () => {
  it("walks the forced exit in order", () => {
    expect(nextEscapeStep(base, 1000).kind).toBe("request_close");
    const closing = { ...base, status: "closing" as const, closureStartedAt: 1000n };
    expect(nextEscapeStep(closing, 1100)).toEqual({ kind: "wait", secondsLeft: 800 });
    expect(nextEscapeStep(closing, 1900).kind).toBe("seal");
    const sealed = { ...base, status: "sealed" as const };
    expect(nextEscapeStep(sealed, 5000)).toEqual({ kind: "withdraw", refund: 120000n });
    expect(nextEscapeStep({ ...sealed, payerWithdrawnAt: 5n }, 5000)).toEqual({ kind: "done", reason: "refunded" });
    expect(nextEscapeStep({ ...sealed, refundable: 0n }, 5000)).toEqual({ kind: "done", reason: "nothing_to_withdraw" });
    expect(nextEscapeStep({ ...base, status: "distributed" }, 1)).toEqual({ kind: "done", reason: "distributed" });
    expect(nextEscapeStep(null, 1).kind).toBe("missing");
  });
  it("has plain words for every step", () => {
    for (const s of [{ kind: "request_close" }, { kind: "wait", secondsLeft: 61 }, { kind: "seal" }, { kind: "withdraw", refund: 1n }, { kind: "missing" }] as const) {
      expect(humanStep(s as never)).toMatch(/\w/);
    }
    expect(humanStep({ kind: "wait", secondsLeft: 61 })).toContain("2 min");
  });
});

describe("salt grinding", () => {
  const seed = { payer: "2nzqHcYzmi1PPjAbpzKfyaMvP1Y4x2zCzDfMCt3f5uAF", payee: "DX1FrBZqdbMJbSdDivXFcjkwpLySjzEieKGVwjwxWuHH", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", authorizedSigner: "5FR72SB6UEPKooSoUso4Q8rvb3BYXVe3AWCa8XaSdnh7", openSlot: 466625415n };
  it("finds a salt whose channel and escrow both have bump 255", async () => {
    const r = await grindSalt(seed, 1n);
    expect(r.channelBump).toBe(255);
    expect(r.escrowBump).toBe(255);
    const again = await deriveChannel(seed, r.salt);
    expect(again.channel).toBe(r.channel);
  }, 60000);
  it("savings model", () => { expect(savedComputeUnits(255, 255)).toBe(0); expect(savedComputeUnits(254, 253)).toBe(4500); });
});
