// Plain-words decoding of a PAYMENT-REQUIRED requirement. The amount shown is the amount signed:
// both come from the same `amount` string in the selected requirement (tested).
import { formatUsdc, mmss } from "../billing/meter";

export type RequirementLike = { amount: string; scheme?: string; network?: string; payTo?: string; asset?: string; extra?: { withdrawDelay?: number } };

export type Approval = {
  capAtomic: string;
  capText: string;
  headline: string;
  lines: string[];
  graceMinutes: number;
  network: string;
  payTo: string;
};

export function describeRequirement(req: RequirementLike, declaredSeconds: number): Approval {
  if (req.scheme && req.scheme !== "upto") throw new Error("unexpected_scheme");
  const cap = BigInt(req.amount);
  const grace = Math.round((req.extra?.withdrawDelay ?? 900) / 60);
  const capText = `$${formatUsdc(cap)}`;
  return {
    capAtomic: cap.toString(),
    capText,
    graceMinutes: grace,
    network: req.network ?? "",
    payTo: req.payTo ?? "",
    headline: `Up to ${capText} for ${mmss(declaredSeconds)} of audio`,
    lines: [
      "You are charged only for minutes delivered.",
      "Unused money returns automatically in the same settlement.",
      `If Meruit goes quiet, you can take it back yourself after ${grace} minutes.`,
    ],
  };
}
