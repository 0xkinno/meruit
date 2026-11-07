import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { capForSeconds, chargeForDelivered, settleAmount, refundFor, formatUsdc, mmss } from "@/lib/billing/meter";

const RATE = 10000n;
const MAX = 250000n;

describe("meter", () => {
  it("cap rounds up", () => {
    expect(capForSeconds(1, RATE, MAX)).toBe(167n); // 10000/60 = 166.67
    expect(capForSeconds(60, RATE, MAX)).toBe(10000n);
    expect(capForSeconds(720, RATE, MAX)).toBe(120000n);
  });
  it("charge rounds down", () => {
    expect(chargeForDelivered(1, RATE)).toBe(166n);
    expect(chargeForDelivered(540, RATE)).toBe(90000n);
  });
  it("charge never exceeds cap for any delivered <= declared", () => {
    for (let declared = 1; declared <= 1500; declared += 7) {
      const cap = capForSeconds(declared, RATE, 10n ** 12n);
      for (let d = 0; d <= declared; d += Math.max(1, Math.floor(declared / 9))) {
        expect(chargeForDelivered(d, RATE) <= cap).toBe(true);
      }
      expect(chargeForDelivered(declared, RATE) <= cap).toBe(true);
    }
  });
  it("zero delivery charges zero and refunds the full cap", () => {
    const cap = capForSeconds(720, RATE, MAX);
    expect(chargeForDelivered(0, RATE)).toBe(0n);
    expect(refundFor(cap, settleAmount(0, cap, RATE))).toBe(cap);
  });
  it("settleAmount clamps to the cap", () => {
    expect(settleAmount(10_000, 500n, RATE)).toBe(500n);
  });
  it("rejects invalid or oversized jobs", () => {
    expect(() => capForSeconds(0, RATE, MAX)).toThrow("invalid_length");
    expect(() => capForSeconds(1.5, RATE, MAX)).toThrow("invalid_length");
    expect(() => capForSeconds(1501, RATE, MAX)).toThrow("job_above_cap");
    expect(() => refundFor(1n, 2n)).toThrow("charge_above_cap");
  });
  it("12 minutes with 3 chunks dropped charges 9 minutes and refunds 3", () => {
    const cap = capForSeconds(720, RATE, MAX);
    const charge = settleAmount(540, cap, RATE);
    expect(charge).toBe(90000n);
    expect(refundFor(cap, charge)).toBe(30000n);
  });
  it("formats without floats", () => {
    expect(formatUsdc(120000n)).toBe("0.12");
    expect(formatUsdc(30000n)).toBe("0.03");
    expect(formatUsdc(1_500_000n)).toBe("1.50");
    expect(formatUsdc(250000n)).toBe("0.25");
    expect(formatUsdc(1n)).toBe("0.000001");
    expect(mmss(432)).toBe("07:12");
  });
  it("money paths contain no float parsing", () => {
    for (const dir of ["lib/billing", "lib/channels"]) {
      for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
        const src = readFileSync(`${dir}/${f}`, "utf8");
        expect(src, `${dir}/${f}`).not.toMatch(/parseFloat|Number\(/);
      }
    }
  });
});
