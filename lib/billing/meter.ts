// Cap and charge math. Integers only (bigint atomic USDC units, 6 decimals). No floats.

export const USDC_DECIMALS = 6;

function envBig(name: string, fallback: string): bigint {
  return BigInt(process.env[name] || fallback);
}

export const rateAtomicPerMin = () => envBig("MERUIT_RATE_ATOMIC_PER_MIN", "10000");
export const maxJobAtomic = () => envBig("MERUIT_MAX_JOB_ATOMIC", "250000");

/** The ceiling the buyer signs. Rounds up so delivery always fits under it. */
export function capForSeconds(seconds: number, rate = rateAtomicPerMin(), max = maxJobAtomic()): bigint {
  if (!Number.isInteger(seconds) || seconds <= 0) throw new Error("invalid_length");
  const cap = (BigInt(seconds) * rate + 59n) / 60n;
  if (cap > max) throw new Error("job_above_cap");
  return cap;
}

/** What is charged for delivered seconds. Rounds down: the buyer never pays for a fraction. */
export function chargeForDelivered(seconds: number, rate = rateAtomicPerMin()): bigint {
  if (!Number.isInteger(seconds) || seconds < 0) throw new Error("invalid_seconds");
  return (BigInt(seconds) * rate) / 60n;
}

/** Charge clamped to the cap. A charge above the cap must never reach the program. */
export function settleAmount(deliveredSeconds: number, cap: bigint, rate = rateAtomicPerMin()): bigint {
  const charge = chargeForDelivered(deliveredSeconds, rate);
  return charge > cap ? cap : charge;
}

export function refundFor(cap: bigint, charge: bigint): bigint {
  if (charge > cap) throw new Error("charge_above_cap");
  return cap - charge;
}

/** Formats atomic USDC as a dollar string without floats, e.g. 120000n -> "0.12". */
export function formatUsdc(atomic: bigint, minFraction = 2): string {
  const neg = atomic < 0n;
  const a = neg ? -atomic : atomic;
  const whole = a / 1_000_000n;
  let frac = (a % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  while (frac.length < minFraction) frac += "0";
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}

/** Splits seconds into mm:ss for display. */
export function mmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
