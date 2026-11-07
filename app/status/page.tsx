import type { Metadata } from "next";
import { GlowCard } from "@/components/GlowCard";
import { runProbes } from "@/lib/probes";
import { networkName } from "@/lib/channels/constants";
import { backendName } from "@/lib/store";

export const metadata: Metadata = { title: "Status" };
export const dynamic = "force-dynamic";

export default async function Status() {
  const probes = await runProbes();
  return (
    <main id="main" className="pb-8 pt-10" data-testid="status">
      <p className="label-mono">Status</p>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Measured, not claimed.</h1>
      <p className="mt-3 max-w-2xl text-graphite">Each row is a call this server just made, with its time. Network: {networkName()}. Store: {backendName()}.</p>
      <GlowCard className="mt-8 p-4 sm:p-6">
        <ul className="divide-y hairline">
          {probes.map((p) => (
            <li key={p.name} className="grid gap-1 py-3 sm:grid-cols-[220px_90px_1fr_auto] sm:items-center">
              <span className="font-mono text-sm">{p.name}</span>
              <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 font-mono text-xs ${p.ok === true ? "border-mint bg-mint/30" : p.ok === false ? "border-ember bg-ember/10 text-ember-ink" : "border-ink/30 text-graphite"}`}>
                {p.ok === true ? "ok" : p.ok === false ? "problem" : "not set"}
              </span>
              <span className="text-sm text-graphite">{p.detail}</span>
              <span className="font-mono text-xs text-graphite">{p.ms}ms, {p.at.slice(11, 19)}Z</span>
            </li>
          ))}
        </ul>
      </GlowCard>
    </main>
  );
}
