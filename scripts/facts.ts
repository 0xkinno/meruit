/**
 * Aggregates runs/ into docs/FACTS.json. With --check, fails if the file on disk differs from a fresh aggregate
 * (ignoring generatedAt). README and UI numbers must come from the file.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Run = { id?: string; signatures?: Record<string, string>; network?: string; cap?: string; charge?: string; refund?: string; state?: string; kind?: string; wild?: boolean; checkCues?: number; cues?: number; depositMinutes?: number; depositSlots?: number; costUsd?: string; deliveredSeconds?: number };

function readRuns(dir: string): Run[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? readRuns(join(dir, e.name)) : e.name.endsWith(".json") ? [JSON.parse(readFileSync(join(dir, e.name), "utf8")) as Run] : [],
  );
}
const usd = (a: bigint) => `${a / 1_000_000n}.${(a % 1_000_000n).toString().padStart(6, "0").slice(0, 2)}`;

export function aggregate(runs: Run[]) {
  const jobs = runs.filter((r) => r.cap !== undefined && r.charge !== undefined && (r.id ?? "").startsWith("job_"));
  let cap = 0n, charge = 0n, over = 0, under = 0;
  for (const j of jobs) {
    const c = BigInt(j.cap!), ch = BigInt(j.charge!);
    cap += c; charge += ch;
    if (ch > c) over++;
    if ((j.deliveredSeconds ?? 0) > 0 && ch === 0n) under++;
  }
  const wild = jobs.filter((j) => j.wild);
  const cues = wild.reduce((s, j) => s + (j.cues ?? 0), 0);
  const checks = wild.reduce((s, j) => s + (j.checkCues ?? 0), 0);
  const dep = runs.filter((r) => r.depositMinutes !== undefined).map((r) => r.depositMinutes!).sort((a, b) => a - b);
  const slots = runs.filter((r) => r.depositSlots !== undefined);
  return {
    generatedAt: null as string | null,
    network: Array.from(new Set(jobs.map((j) => j.network).filter(Boolean))).sort().join(" and ") || null,
    byNetwork: Object.fromEntries(Array.from(new Set(jobs.map((j) => j.network ?? "unknown"))).sort().map((n) => [n, jobs.filter((j) => (j.network ?? "unknown") === n).length])),
    jobs: jobs.length,
    overcharges: jobs.length ? over : null,
    returnedUsd: jobs.length ? usd(cap - charge) : null,
    forcedExits: runs.filter((r) => (r.kind === "forced_exit" && r.state === "refunded") || !!r.signatures?.withdraw).length,
    wild: { jobs: wild.length, overchargeCount: wild.length ? wild.filter((j) => BigInt(j.charge!) > BigInt(j.cap!)).length : null, undercharges: wild.length ? under : null, checkCueRate: cues ? `${((checks * 100) / cues).toFixed(1)}%` : null },
    deposits: { count: dep.length, medianMinutes: dep.length ? dep[Math.floor(dep.length / 2)] : null, fractionAbove1500Slots: slots.length ? `${slots.filter((r) => r.depositSlots! > 1500).length}/${slots.length}` : null },
    costPerMinuteUsd: runs.find((r) => r.costUsd)?.costUsd ?? null,
  };
}

const out = "docs/FACTS.json";
const fresh = aggregate(readRuns("runs"));
if (process.argv.includes("--check")) {
  const disk = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null;
  const strip = (x: unknown) => JSON.stringify({ ...(x as object), generatedAt: null });
  if (!disk || strip(disk) !== strip(fresh)) { console.error("docs/FACTS.json does not match runs/. Run: npm run facts"); process.exit(1); }
  console.log("FACTS.json matches runs/");
} else {
  mkdirSync("docs", { recursive: true });
  writeFileSync(out, JSON.stringify({ ...fresh, generatedAt: new Date().toISOString() }, null, 2) + "\n");
  console.log(`wrote ${out}: ${fresh.jobs} jobs`);
}
