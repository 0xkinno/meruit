import type { Metadata } from "next";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GlowCard } from "@/components/GlowCard";
import { FACTS } from "@/lib/facts";
import { capForSeconds, settleAmount, refundFor, formatUsdc } from "@/lib/billing/meter";

export const metadata: Metadata = { title: "Proof" };
export const dynamic = "force-static";

type Break = { id: string; title: string; result: string; signature?: string; error?: string; network?: string };

function breaks(): Break[] {
  const dir = join(process.cwd(), "runs", "break");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Break);
}

const FAILURES = [
  ["Wallet rejects the signature", "No channel is opened and nothing is charged. The studio says so and offers to try again.", "components/Studio.tsx"],
  ["Payment fails verification", "The request is refused with 402 before any work starts. Nothing moves.", "lib/x402/server.ts"],
  ["Upstream fails on some minutes", "Failed parts are listed as not delivered, not charged. The charge counts delivered seconds only.", "app/api/transcribe/route.ts"],
  ["Seller goes quiet", "Your wallet asks to close, waits out the delay, locks the job, and takes the unused money back.", "lib/channels/escape.ts"],
  ["Stale channel slot", "The program refuses an open that is more than 1,500 slots old. Nothing moves.", "lib/sabotage.ts"],
  ["Seller asks for more than the ceiling", "The program refuses any settlement above the deposit.", "lib/billing/meter.ts"],
  ["Same settlement twice", "The second attempt is refused. The settled watermark only moves forward.", "lib/sabotage.ts"],
  ["Short deposit from another chain", "The transfer is marked incomplete or returned to the sending address, with its own screen.", "lib/aurora/status.ts"],
];

export default function Proof() {
  const cap = capForSeconds(720, 10000n, 250000n);
  const charge = settleAmount(540, cap, 10000n);
  const rows = breaks();
  const tile = (k: string, v: string | number | null, none = "not measured") => (
    <GlowCard className="p-5"><p className="label-mono">{k}</p><p className="mt-2 font-display text-3xl font-semibold" data-testid="proof-tile">{v === null || v === 0 ? none : String(v)}</p></GlowCard>
  );
  return (
    <main id="main" className="pb-8 pt-10" data-testid="proof">
      <p className="label-mono">Proof</p>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">What was measured.</h1>
      <p className="mt-3 max-w-2xl text-graphite">Numbers are read from <code className="font-mono text-sm">docs/FACTS.json</code>, written by scripts from recorded runs. Where nothing was run yet, the tile says so. Last generated: {FACTS.generatedAt ?? "never"}.</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {tile("Jobs", FACTS.jobs, "none yet")}
        {tile("Overcharges", FACTS.overcharges)}
        {tile("Returned to buyers", FACTS.returnedUsd === null ? null : `$${FACTS.returnedUsd}`)}
        {tile("Forced exits", FACTS.forcedExits, "none yet")}
        {tile("Wild set jobs", FACTS.wild.jobs, "none yet")}
        {tile("Undercharges", FACTS.wild.undercharges)}
        {tile("Check cue rate", FACTS.wild.checkCueRate)}
        {tile("Median deposit minutes", FACTS.deposits.medianMinutes)}
      </div>

      <GlowCard className="mt-10 p-6">
        <h2 className="font-display text-2xl font-semibold">Same clip, three ways to pay</h2>
        <p className="mt-2 text-sm text-graphite">A 12 minute clip where 3 of 12 parts fail upstream. Computed from the meter code, not typed.</p>
        <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Comparison table">
          <table className="w-full min-w-[520px] text-left text-sm" data-testid="counterfactual">
            <thead className="label-mono"><tr><th className="py-2">Way to pay</th><th>Paid</th><th>For</th></tr></thead>
            <tbody>
              <tr className="border-t hairline"><td className="py-2">Monthly card subscription</td><td className="text-graphite">price source pending</td><td>card declined for international web payments</td></tr>
              <tr className="border-t hairline"><td className="py-2">Prepay the full ceiling (exact transfer)</td><td className="font-mono">${formatUsdc(cap)}</td><td>9 minutes delivered, nothing returned</td></tr>
              <tr className="border-t hairline"><td className="py-2">Meruit (upto)</td><td className="font-mono">${formatUsdc(charge)}</td><td>9 minutes delivered, ${formatUsdc(refundFor(cap, charge))} returned</td></tr>
            </tbody>
          </table>
        </div>
      </GlowCard>

      <GlowCard className="mt-6 p-6">
        <h2 className="font-display text-2xl font-semibold">Break campaign</h2>
        {rows.length === 0 ? <p className="mt-2 text-graphite">No break runs recorded yet. Each run is published here with its signature or decoded error, including misses.</p> : (
          <ul className="mt-3 divide-y hairline">{rows.map((r) => (<li key={r.id} className="py-3"><p className="font-medium">{r.id}: {r.title}</p><p className="text-sm text-graphite">{r.result}</p>{r.signature && <p className="break-all font-mono text-xs">{r.signature}</p>}{r.error && <p className="font-mono text-xs text-ember-ink">{r.error}</p>}</li>))}</ul>
        )}
      </GlowCard>

      <GlowCard className="mt-6 p-6">
        <h2 className="font-display text-2xl font-semibold">When something fails</h2>
        <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Failure handling table">
          <table className="w-full min-w-[620px] text-left text-sm" data-testid="failure-table">
            <thead className="label-mono"><tr><th className="py-2">What fails</th><th>What happens</th><th>Where</th></tr></thead>
            <tbody>{FAILURES.map(([a, b, c]) => (<tr key={a} className="border-t hairline align-top"><td className="py-2 pr-3 font-medium">{a}</td><td className="pr-3 text-graphite">{b}</td><td className="font-mono text-xs">{c}</td></tr>))}</tbody>
          </table>
        </div>
      </GlowCard>
    </main>
  );
}
