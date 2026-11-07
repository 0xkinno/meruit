import { describe, it, expect } from "vitest";
import { describeRequirement } from "@/lib/x402/describe";
import { capForSeconds } from "@/lib/billing/meter";

describe("approval text", () => {
  it("shown amount equals the amount that will be signed", () => {
    const cap = capForSeconds(720, 10000n, 250000n);
    const req = { scheme: "upto", amount: cap.toString(), network: "solana:x", payTo: "P", extra: { withdrawDelay: 900 } };
    const a = describeRequirement(req, 720);
    expect(a.capAtomic).toBe(req.amount);
    expect(a.capText).toBe("$0.12");
    expect(a.headline).toBe("Up to $0.12 for 12:00 of audio");
    expect(a.lines.join(" ")).toContain("15 minutes");
  });
  it("refuses other schemes", () => {
    expect(() => describeRequirement({ scheme: "exact", amount: "1" }, 60)).toThrow("unexpected_scheme");
  });
});
