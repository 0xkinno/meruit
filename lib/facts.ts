// Headline numbers are read from docs/FACTS.json, written by scripts/facts.ts from real runs. Never typed.
import facts from "../docs/FACTS.json";

export type Facts = {
  generatedAt: string | null;
  network: string | null;
  byNetwork: Record<string, number>;
  jobs: number;
  overcharges: number | null;
  returnedUsd: string | null;
  forcedExits: number;
  wild: { jobs: number; overchargeCount: number | null; undercharges: number | null; checkCueRate: string | null };
  deposits: { count: number; medianMinutes: number | null; fractionAbove1500Slots: string | null };
  costPerMinuteUsd: string | null;
};

export const FACTS = facts as Facts;

/** The hero line. Returns null until real runs exist; the UI then says so instead of showing a number. */
export function headline(f: Facts = FACTS): string | null {
  if (!f.jobs || f.overcharges === null || f.returnedUsd === null) return null;
  const split = Object.entries(f.byNetwork ?? {}).map(([n, c]) => `${c} ${n}`).join(", ");
  return `${f.jobs} jobs${split ? ` (${split})` : ""}, ${f.overcharges} overcharges, $${f.returnedUsd} returned`;
}
