import Link from "next/link";
import { HeroScene } from "@/components/HeroScene";
import { GlowCard, Reveal } from "@/components/GlowCard";
import { LandingEffects } from "@/components/LandingEffects";
import { ChainInIcon, DoorIcon, MeterIcon, ReceiptIcon } from "@/components/icons";
import { FACTS, headline } from "@/lib/facts";

const REPO = "https://github.com/0xkinno/meruit";
const CHAINS = ["Tron", "Base", "Arbitrum", "BNB Chain", "Ethereum", "NEAR"];

function Label({ n, children }: { n: string; children: React.ReactNode }) {
  return <p className="label-mono">{n} / {children}</p>;
}

const MOMENTS = [
  { t: "22:10", h: "The card says no", b: "A Berlin client sends a 12 minute interview, due at 08:00. The tool wants a monthly card. Her naira card is declined for international web payments." },
  { t: "22:14", h: "She sends USDT from Tron", b: "Forty-one dollars of USDT from her last client. She sends it to one address that belongs to her." },
  { t: "22:31", h: "Captions, then change", b: "The subtitles play over her video. She is charged for the minutes delivered. The rest comes back in the same moment." },
];

const STEPS = [
  { n: "1", h: "Ceiling signed", b: "She approves one amount in her own wallet. It is the most a job can ever cost." },
  { n: "2", h: "Captions delivered", b: "Only minutes that were delivered are counted. A failed minute is not charged." },
  { n: "3", h: "Change returned", b: "What was not used goes back to her wallet in the same settlement." },
];

export default function Home() {
  const line = headline();
  return (
    <main id="main">
      <LandingEffects />
      <section className="grid items-center gap-10 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20" aria-labelledby="hero-h">
        <div>
          <p className="label-mono">Subtitles, paid per minute delivered</p>
          <h1 id="hero-h" className="mt-4 font-display text-[44px] font-semibold leading-[1.02] sm:text-[72px] lg:text-[88px]">Pay for the minutes you got.</h1>
          <p className="mt-6 max-w-xl text-lg text-graphite">
            Subtitles and other per-use tools, charged on Solana only for what was delivered. Top up from any chain. Unused money comes back.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/studio" className="inline-flex h-12 items-center rounded-capsule bg-amethyst-deep px-6 font-medium text-white shadow-print-sm hover:bg-amethyst">Caption a clip</Link>
            <Link href="/judge" className="inline-flex h-12 items-center rounded-capsule border border-ink bg-paper px-6 font-medium text-ink hover:bg-vellum">Watch a recorded run</Link>
          </div>
          <p className="mt-6 font-mono text-xs text-graphite" data-testid="facts-line">
            {line ?? "No runs recorded yet. This line fills from real runs."}
          </p>
        </div>
        <div className="pt-4 lg:pt-0">
          <HeroScene />
          <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-graphite">Illustration of one job</p>
        </div>
      </section>

      <section className="py-16" aria-labelledby="moment-h">
        <Reveal><Label n="01">The moment</Label><h2 id="moment-h" className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Ten past ten in Enugu.</h2>
          <p className="small-caps mt-2 text-sm text-graphite">Ifeoma Nwosu is a fictional person</p></Reveal>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {MOMENTS.map((m, i) => (
            <Reveal key={m.t} delay={i * 0.08}>
              <GlowCard className="h-full p-6"><p className="font-mono text-sm text-amethyst-deep">{m.t}</p><h3 className="mt-3 font-display text-2xl font-semibold">{m.h}</h3><p className="mt-2 text-graphite">{m.b}</p></GlowCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-16" aria-labelledby="how-h">
        <Reveal><Label n="02">How a job moves</Label><h2 id="how-h" className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Three steps, one receipt.</h2></Reveal>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <GlowCard className="h-full p-6">
                <div className="text-amethyst-deep">{i === 0 ? <MeterIcon /> : i === 1 ? <ReceiptIcon /> : <ChainInIcon />}</div>
                <p className="mt-4 font-mono text-xs text-graphite">STEP {s.n}</p>
                <h3 className="mt-1 font-display text-2xl font-semibold">{s.h}</h3>
                <p className="mt-2 text-graphite">{s.b}</p>
              </GlowCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-16" aria-labelledby="chains-h">
        <Reveal><Label n="03">Money from any chain</Label><h2 id="chains-h" className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Send from where your money already is.</h2></Reveal>
        <Reveal delay={0.05}>
          <GlowCard className="mt-8 p-6 sm:p-8">
            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
              <ul className="flex flex-wrap gap-2" aria-label="Chains you can send from">
                {CHAINS.map((c) => <li key={c} className="inline-flex h-11 items-center rounded-full border border-ink bg-paper px-4 text-sm">{c}</li>)}
              </ul>
              <svg width="64" height="24" viewBox="0 0 64 24" className="mx-auto hidden text-amethyst md:block" aria-hidden><path d="M2 12h54M46 4l10 8-10 8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" /></svg>
              <div className="rounded-card border border-ink bg-paper p-5">
                <p className="label-mono">Arrives as</p><p className="mt-1 font-display text-3xl font-semibold">USDC on Solana</p>
              </div>
            </div>
            <p className="mt-6 text-graphite">Send from the wallet or exchange you already use. One address per chain, yours to keep.</p>
            <p className="mt-2 text-sm text-graphite">Powered by Aurora Intents.</p>
          </GlowCard>
        </Reveal>
      </section>

      <section className="py-16" aria-labelledby="vanish-h">
        <Reveal><Label n="04">Even if we vanish</Label><h2 id="vanish-h" className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Your money does not depend on us.</h2></Reveal>
        <Reveal delay={0.05}>
          <GlowCard className="mt-8 p-6 sm:p-8">
            <ol className="grid gap-4 md:grid-cols-4">
              {[["Request close", "Your wallet asks to end the job."], ["15 minute delay", "A safety wait that no one can skip."], ["Seal", "Anyone can lock the job once the wait is over."], ["Money back", "Your wallet takes the unused amount home."]].map(([h, b], i) => (
                <li key={h} className="rounded-card border border-ink/30 bg-paper p-4"><p className="font-mono text-xs text-amethyst-deep">{String(i + 1).padStart(2, "0")}</p><p className="mt-2 font-display text-xl font-semibold">{h}</p><p className="mt-1 text-sm text-graphite">{b}</p></li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap items-center gap-4"><span className="text-ink"><DoorIcon /></span>
              <p className="text-graphite">This works from your wallet alone. Meruit&apos;s servers are not in the path.</p>
              <Link href="/rescue" className="inline-flex h-11 items-center text-amethyst-deep underline underline-offset-4">Get my money back</Link>
            </div>
          </GlowCard>
        </Reveal>
      </section>

      <section className="py-16" aria-labelledby="proof-h">
        <Reveal><Label n="05">Proof</Label><h2 id="proof-h" className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Numbers come from real runs.</h2></Reveal>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Jobs recorded", FACTS.jobs ? String(FACTS.jobs) : "none yet"],
            ["Overcharges", FACTS.overcharges === null ? "not measured" : String(FACTS.overcharges)],
            ["Returned to buyers", FACTS.returnedUsd === null ? "not measured" : `$${FACTS.returnedUsd}`],
            ["Forced exits completed", FACTS.forcedExits ? String(FACTS.forcedExits) : "none yet"],
          ].map(([k, v], i) => (
            <Reveal key={k} delay={i * 0.06}><GlowCard className="h-full p-5"><p className="label-mono">{k}</p><p className="mt-2 font-display text-3xl font-semibold" data-testid="fact-tile">{v}</p></GlowCard></Reveal>
          ))}
        </div>
        <p className="mt-6 text-graphite">Every number is read from a file generated by the run scripts. Where there is no run yet, we say so. <Link href="/proof" className="text-amethyst-deep underline underline-offset-4">See the proof page</Link>.</p>
      </section>

      <section className="py-16" aria-labelledby="judges-h">
        <Reveal>
          <GlowCard className="p-6 sm:p-10">
            <Label n="06">For judges</Label>
            <h2 id="judges-h" className="mt-3 font-display text-4xl font-semibold">A sixty second walk.</h2>
            <p className="mt-3 max-w-2xl text-graphite">Play a recorded run, break it on purpose, then run it yourself. Everything links to a signature you can open.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/judge" className="inline-flex h-12 items-center rounded-capsule bg-amethyst-deep px-6 font-medium text-white hover:bg-amethyst">Start the walk</Link>
              <a href={REPO} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center rounded-capsule border border-ink bg-paper px-6 font-medium hover:bg-vellum">Repository</a>
              <Link href="/status" className="inline-flex h-12 items-center rounded-capsule border border-ink bg-paper px-6 font-medium hover:bg-vellum">Live status</Link>
            </div>
          </GlowCard>
        </Reveal>
      </section>
    </main>
  );
}
