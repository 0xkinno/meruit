import { describe, it, expect } from "vitest";
import { buildQuoteBody } from "@/lib/aurora/swap";
import { screenFor, ALL_STATUSES } from "@/lib/aurora/status";
import { senderId } from "@/lib/aurora/deposits";

describe("aurora", () => {
  it("quote body sets a refund address and the required fields", () => {
    const b = buildQuoteBody({ dry: true, originAsset: "a", destinationAsset: "b", amount: "1000000", recipient: "R", refundTo: "S" });
    expect(b).toMatchObject({ dry: true, swapType: "EXACT_INPUT", depositType: "ORIGIN_CHAIN", refundTo: "S", refundType: "ORIGIN_CHAIN", recipientType: "DESTINATION_CHAIN" });
    expect(b).not.toHaveProperty("confidentiality");
    expect(buildQuoteBody({ dry: true, originAsset: "a", destinationAsset: "b", amount: "1", recipient: "R", refundTo: "S", confidentiality: "basic" })).toHaveProperty("confidentiality", "basic");
  });
  it("every status has its own screen and terminal states are marked", () => {
    const titles = new Set(ALL_STATUSES.map((s) => screenFor(s).title));
    expect(titles.size).toBe(ALL_STATUSES.length);
    expect(ALL_STATUSES.filter((s) => screenFor(s).terminal)).toEqual(["SUCCESS", "REFUNDED", "FAILED"]);
    expect(screenFor("REFUNDED", { refundAddress: "T123" }).body).toContain("T123");
  });
  it("screens use no bridge vocabulary", () => {
    for (const s of ALL_STATUSES) { const x = screenFor(s); expect(`${x.title} ${x.body}`.toLowerCase()).not.toMatch(/bridge|swap|intent|relay|1click/); }
  });
  it("sender id is stable and opaque", () => {
    expect(senderId("abc")).toBe(senderId("abc"));
    expect(senderId("abc")).not.toContain("abc");
    expect(senderId("abc")).not.toBe(senderId("abd"));
  });
});
