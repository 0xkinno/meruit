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

import { getChannelEncoder } from "@/lib/channels/generated/accounts/channel";
import { PAYER_OFFSET } from "@/lib/channels/discover";
import { address, getAddressEncoder } from "@solana/kit";

describe("channel discovery layout", () => {
  it("payer sits at the memcmp offset in the encoded account", () => {
    const payer = address("2nzqHcYzmi1PPjAbpzKfyaMvP1Y4x2zCzDfMCt3f5uAF");
    const other = address("DX1FrBZqdbMJbSdDivXFcjkwpLySjzEieKGVwjwxWuHH");
    const bytes = getChannelEncoder().encode({
      discriminator: 1, version: 1, bump: 255, status: 0, salt: 1n, deposit: 5n, settlement: { settled: 0n, payoutWatermark: 0n },
      closureStartedAt: 0n, payerWithdrawnAt: 0n, gracePeriod: 900, distributionHash: new Array(32).fill(7),
      payer, payee: other, authorizedSigner: other, mint: other, rentPayer: other, openSlot: 9n,
    });
    expect(bytes.length).toBeLessThanOrEqual(256);
    expect(Array.from(bytes.slice(PAYER_OFFSET, PAYER_OFFSET + 32))).toEqual(Array.from(getAddressEncoder().encode(payer)));
  });
});
