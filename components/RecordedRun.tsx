"use client";
import { useRef, useState } from "react";
import { explorerTx } from "@/lib/channels/constants";
import { formatUsdc, mmss } from "@/lib/billing/meter";

export type Recorded = {
  recordedAt: string;
  network: "mainnet" | "devnet";
  video: string;
  cues: { id: number; start: number; end: number; text: string; check: boolean }[];
  cap: string;
  charge: string;
  refund: string;
  signatures: Record<string, string>;
};

const short = (s: string) => `${s.slice(0, 10)}...${s.slice(-6)}`;

export function RecordedRun({ run }: { run: Recorded }) {
  const [time, setTime] = useState(0);
  const media = useRef<HTMLVideoElement | null>(null);
  const active = run.cues.find((c) => time >= c.start && time <= c.end);
  const shown = active ?? run.cues.find((c) => c.start >= time) ?? run.cues[0];
  const seek = (t: number) => {
    const m = media.current;
    if (!m) return;
    m.currentTime = t;
    m.play().catch(() => undefined);
  };
  return (
    <div data-testid="recorded-run">
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Ceiling", `$${formatUsdc(BigInt(run.cap))}`, ""], ["Charged", `$${formatUsdc(BigInt(run.charge))}`, ""], ["Returned", `$${formatUsdc(BigInt(run.refund))}`, "text-mint-ink"]].map(([k, v, tone]) => (
          <div key={k} className="rounded-xl border border-ink/30 bg-paper p-3">
            <p className="label-mono">{k}</p>
            <p className={`font-display text-3xl font-semibold ${tone}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-4 overflow-hidden rounded-xl border border-ink bg-ink">
        <video ref={media} src={run.video} poster="/samples/hero-12min-poster.jpg" controls playsInline preload="metadata" className="aspect-video w-full" onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} data-testid="recorded-player" aria-label="Recorded job audio with a waveform" />
        {active && <p aria-hidden className="pointer-events-none absolute inset-x-3 bottom-14 mx-auto w-fit max-w-[92%] rounded-lg bg-ink/80 px-3 py-2 text-center text-base text-white sm:text-lg">{active.text}</p>}
      </div>
      <p aria-live="polite" data-testid="now-caption" className="mt-3 min-h-[3.5rem] rounded-xl border border-ink/30 bg-paper p-3 text-base">
        <span className="label-mono mr-2">{active ? "Now" : "Starts with"}</span>
        {shown?.text}
      </p>
      <p className="mt-2 font-mono text-xs text-graphite">The picture is the audio waveform; the captions are the real output of that job. Recorded live run, {run.recordedAt.slice(0, 10)}, {run.network}.</p>

      <h3 className="mt-5 font-display text-xl font-semibold">Transcript ({run.cues.length} lines)</h3>
      <div role="region" aria-label="Transcript" tabIndex={0} className="mt-2 max-h-64 overflow-auto rounded-xl border border-ink/20 bg-paper p-2">
        <ul>
          {run.cues.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => seek(c.start)} className={`flex min-h-11 w-full items-start gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-vellum ${active?.id === c.id ? "bg-vellum" : ""}`}>
                <span className="font-mono text-xs text-amethyst-deep">{mmss(c.start)}</span>
                <span>{c.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <h3 className="mt-5 font-display text-xl font-semibold">Signatures</h3>
      <ul className="mt-1">
        {Object.entries(run.signatures).map(([k, s]) => (
          <li key={k}>
            <a className="flex min-h-11 flex-wrap items-center gap-x-3 text-sm text-amethyst-deep underline underline-offset-4" href={explorerTx(s, run.network)} target="_blank" rel="noreferrer">
              <span className="label-mono no-underline">{k}</span>
              <span className="break-all font-mono text-xs">{short(s)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
