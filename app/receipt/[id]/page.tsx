import type { Metadata } from "next";
import Link from "next/link";
import { GlowCard } from "@/components/GlowCard";
import { loadJob } from "@/lib/jobView";
import { formatUsdc, mmss } from "@/lib/billing/meter";
import { explorerTx, networkName } from "@/lib/channels/constants";

export const metadata: Metadata = { title: "Receipt" };
export const dynamic = "force-dynamic";

function Big({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <GlowCard className="p-5">
      <p className="label-mono">{label}</p>
      <p className={`mt-2 font-display text-5xl font-semibold ${tone}`}>{value}</p>
    </GlowCard>
  );
}

export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { job, error } = await loadJob(id);
  if (!job) {
    return (
      <main id="main" className="pt-10">
        <h1 className="font-display text-4xl font-semibold">Receipt not found</h1>
        <p className="mt-3 text-graphite">{error ?? "No job has this id on this deployment."}</p>
        <Link className="mt-4 inline-flex h-11 items-center text-amethyst-deep underline" href="/studio">Caption a clip</Link>
      </main>
    );
  }
  const cap = BigInt(job.cap);
  const charge = job.charge ? BigInt(job.charge) : null;
  const refund = job.refund ? BigInt(job.refund) : null;
  const net = job.network === "devnet" ? "devnet" : "mainnet";
  return (
    <main id="main" className="pb-8 pt-10" data-testid="receipt">
      <p className="label-mono">Receipt / {job.network}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">One job, three numbers.</h1>
      {job.sabotage && job.sabotage !== "off" && (
        <p className="mt-3 inline-flex rounded-full border border-ember bg-ember/10 px-3 py-1 font-mono text-xs text-ember-ink">Break test: {job.sabotage}</p>
      )}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <Big label="Ceiling" value={`$${formatUsdc(cap)}`} />
        <Big label="Charged" value={charge === null ? "..." : `$${formatUsdc(charge)}`} />
        <Big label="Returned" value={refund === null ? "..." : `$${formatUsdc(refund)}`} tone="text-mint-ink" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <GlowCard className="p-6">
          <h2 className="font-display text-2xl font-semibold">What happened</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-graphite">State</dt>
            <dd className="font-mono">{job.state}</dd>
            <dt className="text-graphite">Declared</dt>
            <dd className="font-mono">{mmss(job.declaredSeconds)}</dd>
            <dt className="text-graphite">Delivered</dt>
            <dd className="font-mono">{job.deliveredSeconds !== undefined ? mmss(job.deliveredSeconds) : "..."}</dd>
          </dl>
          {job.failedChunks && job.failedChunks.length > 0 && (
            <p className="mt-3 rounded-xl border border-ember bg-ember/10 p-3 text-sm text-ember-ink" data-testid="not-delivered">
              Not delivered, not charged: part{job.failedChunks.length > 1 ? "s" : ""} {job.failedChunks.map((i) => i + 1).join(", ")}.
            </p>
          )}
          <p className="mt-4 text-sm">
            <Link className="text-amethyst-deep underline underline-offset-4" href={`/trace/${job.id}`}>See the full timeline</Link>
          </p>
        </GlowCard>
        <GlowCard className="p-6">
          <h2 className="font-display text-2xl font-semibold">Signatures</h2>
          {Object.keys(job.signatures).length === 0 ? (
            <p className="mt-3 text-graphite">No signature recorded for this job yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {Object.entries(job.signatures).map(([k, s]) => (
                <li key={k} className="text-sm">
                  <span className="label-mono">{k}</span>
                  <br />
                  <a className="break-all font-mono text-xs text-amethyst-deep underline" href={explorerTx(s, net)} target="_blank" rel="noreferrer">{s}</a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-graphite">Network: {job.network}. This deployment: {networkName()}. Instructions, bytes and compute units for each signature are on the proof page.</p>
        </GlowCard>
      </div>
    </main>
  );
}
