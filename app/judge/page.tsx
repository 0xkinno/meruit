import type { Metadata } from "next";
import Link from "next/link";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GlowCard } from "@/components/GlowCard";
import { RecordedRun, type Recorded } from "@/components/RecordedRun";
import { networkName } from "@/lib/channels/constants";

export const metadata: Metadata = { title: "For judges" };
export const dynamic = "force-static";

function recorded(): Recorded | null {
  const f = join(process.cwd(), "docs", "recorded", "hero-run.json");
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Recorded) : null;
}

const REPO = "https://github.com/0xkinno/meruit";

export default function Judge() {
  const run = recorded();
  return (
    <main id="main" className="pb-8 pt-10" data-testid="judge">
      <p className="label-mono">For judges</p>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">A sixty second walk.</h1>
      <p className="mt-3 max-w-2xl text-graphite">Live spending is capped at $0.25 per job and $1 per wallet per day. This deployment runs on {networkName()}.</p>

      <ol className="mt-8 space-y-6">
        <li>
          <GlowCard className="p-6">
            <h2 className="font-display text-2xl font-semibold">1. Play a recorded run</h2>
            {run ? <div className="mt-4"><RecordedRun run={run} /></div> : <p className="mt-3 text-graphite" data-testid="no-recording">No recorded run has been published yet. The recording appears here after the first real job on this network, with its signatures.</p>}
          </GlowCard>
        </li>
        <li>
          <GlowCard className="p-6">
            <h2 className="font-display text-2xl font-semibold">2. Break it</h2>
            <p className="mt-2 text-graphite">Three of twelve parts fail upstream: the charge counts nine minutes and three return. The seller goes quiet: your wallet takes the money back alone. Results of each break run are on the proof page with their signatures or decoded errors.</p>
            <div className="mt-4 flex flex-wrap gap-3"><Link href="/proof" className="inline-flex h-11 items-center rounded-capsule border border-ink px-4 text-sm hover:bg-paper">See break results</Link><Link href="/rescue" className="inline-flex h-11 items-center rounded-capsule border border-ink px-4 text-sm hover:bg-paper">Get my money back</Link></div>
          </GlowCard>
        </li>
        <li>
          <GlowCard className="p-6">
            <h2 className="font-display text-2xl font-semibold">3. Run it yourself</h2>
            <p className="mt-2 text-graphite">Connect Phantom and caption a sample clip. The wallet shows the exact ceiling it will sign.</p>
            <Link href="/studio" className="mt-4 inline-flex h-12 items-center rounded-capsule bg-amethyst-deep px-6 font-medium text-white hover:bg-amethyst">Open the studio</Link>
          </GlowCard>
        </li>
        <li>
          <GlowCard className="p-6">
            <h2 className="font-display text-2xl font-semibold">4. Links</h2>
            <ul className="mt-3 grid gap-1 sm:grid-cols-2">
              {[["Status", "/status"], ["Proof", "/proof"], ["Tab", "/tab"], ["Sell this way", "/sell"]].map(([l, h]) => (<li key={h}><Link className="inline-flex h-11 items-center text-amethyst-deep underline underline-offset-4" href={h}>{l}</Link></li>))}
              <li><a className="inline-flex h-11 items-center text-amethyst-deep underline underline-offset-4" href={REPO} target="_blank" rel="noreferrer">Repository</a></li>
            </ul>
          </GlowCard>
        </li>
      </ol>
    </main>
  );
}
