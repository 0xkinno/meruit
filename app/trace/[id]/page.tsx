import type { Metadata } from "next";
import { GlowCard } from "@/components/GlowCard";
import { loadJob } from "@/lib/jobView";

export const metadata: Metadata = { title: "Trace" };
export const dynamic = "force-dynamic";

export default async function Trace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { job, error } = await loadJob(id);
  if (!job) {
    return (
      <main id="main" className="pt-10">
        <h1 className="font-display text-4xl font-semibold">Trace not found</h1>
        <p className="mt-3 text-graphite">{error ?? "No job has this id."}</p>
      </main>
    );
  }
  const t0 = job.events[0]?.at ?? job.createdAt;
  return (
    <main id="main" className="pb-8 pt-10" data-testid="trace">
      <p className="label-mono">Trace</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Every step of this job.</h1>
      <GlowCard className="mt-8 p-6">
        <ol className="space-y-4">
          {job.events.map((e, i) => (
            <li key={i} className="grid grid-cols-[84px_1fr] gap-4">
              <span className="font-mono text-xs text-graphite">+{((e.at - t0) / 1000).toFixed(1)}s</span>
              <div>
                <p className="font-medium">{e.state.split("_").join(" ")} <span className="font-mono text-xs text-graphite">by {e.actor}</span></p>
                {e.note && <p className="text-sm text-graphite">{e.note}</p>}
                {e.signature && <p className="break-all font-mono text-xs">{e.signature}</p>}
              </div>
            </li>
          ))}
        </ol>
      </GlowCard>
    </main>
  );
}
