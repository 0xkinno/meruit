"use client";
import { useState } from "react";
import { explorerTx } from "@/lib/channels/constants";

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

export function RecordedRun({ run }: { run: Recorded }) {
  const [time, setTime] = useState(0);
  const active = run.cues.find((c) => time >= c.start && time <= c.end);
  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-ink bg-ink">
        <video src={run.video} controls playsInline preload="metadata" className="aspect-video w-full" onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} data-testid="recorded-player" />
        {active && <p aria-live="polite" className="pointer-events-none absolute inset-x-3 bottom-14 mx-auto w-fit max-w-[92%] rounded-lg bg-ink/80 px-3 py-2 text-center text-white">{active.text}</p>}
      </div>
      <p className="mt-3 font-mono text-xs text-graphite">Recorded live run, {run.recordedAt.slice(0, 10)}, {run.network}. Captions are the real output of that job.</p>
      <ul className="mt-2 space-y-1">{Object.entries(run.signatures).map(([k, s]) => (<li key={k} className="text-sm"><span className="label-mono">{k}</span> <a className="break-all font-mono text-xs text-amethyst-deep underline" href={explorerTx(s, run.network)} target="_blank" rel="noreferrer">{s}</a></li>))}</ul>
    </div>
  );
}
