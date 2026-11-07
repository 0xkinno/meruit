"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Guided tour: seven steps with chapters and keys (Space, Left, Right, Esc). Starts from ?tour=1.
// ?tour=1&render=1 hides the controls' focus ring and auto-advances so a Playwright script can record it.
const STEPS = [
  { chapter: "Start", path: "/", title: "The promise", body: "Pay for the minutes you got. Subtitles are charged on Solana only for what was delivered." },
  { chapter: "Approve", path: "/studio", title: "Approve a ceiling", body: "Your wallet shows one amount. It is the most this job can cost, and it is exactly what you sign." },
  { chapter: "Captions", path: "/studio", title: "Captions play over the video", body: "Lines appear as the clip plays. Parts that failed are not delivered and not charged." },
  { chapter: "Check", path: "/studio", title: "Lines marked check", body: "Where the model was unsure, the line is marked. Fixing a line is never billed." },
  { chapter: "Receipt", path: "/proof", title: "Three numbers", body: "Ceiling, charged, returned. Each links to a signature you can open." },
  { chapter: "Funding", path: "/tab", title: "Money from any chain", body: "Send from the wallet or exchange you already use. One address per chain, yours to keep." },
  { chapter: "Safety", path: "/rescue", title: "Get my money back", body: "If Meruit goes quiet, your wallet closes the job and takes the unused money home." },
];

export function Tour() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [render, setRender] = useState(false);

  const start = useCallback(() => { setI(0); setOpen(true); }, []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("tour") === "1") { setRender(q.get("render") === "1"); start(); }
    window.addEventListener("meruit:tour", start);
    return () => window.removeEventListener("meruit:tour", start);
  }, [start]);

  const go = useCallback((n: number) => {
    const k = Math.max(0, Math.min(STEPS.length - 1, n));
    setI(k);
    if (STEPS[k].path !== window.location.pathname) router.push(`${STEPS[k].path}?tour=1${render ? "&render=1" : ""}`);
  }, [router, render]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(i + 1); }
      else if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, i, go]);

  useEffect(() => {
    if (!open || !render) return;
    const t = setTimeout(() => { if (i < STEPS.length - 1) go(i + 1); }, 6000);
    return () => clearTimeout(t);
  }, [open, render, i, go]);

  if (!open) return null;
  const s = STEPS[i];
  return (
    <div role="dialog" aria-label="Guided tour" aria-modal="false" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-lg rounded-card border border-ink bg-paper p-5 shadow-print" data-testid="tour">
      <div className="flex items-center justify-between gap-2">
        <p className="label-mono">{s.chapter} / step {i + 1} of {STEPS.length}</p>
        <button type="button" onClick={() => setOpen(false)} className="inline-flex h-11 items-center px-2 text-sm underline">Close</button>
      </div>
      <h2 className="mt-1 font-display text-2xl font-semibold">{s.title}</h2>
      <p className="mt-2 text-graphite">{s.body}</p>
      <ol className="mt-3 flex gap-1" aria-label="Chapters">{STEPS.map((x, k) => (<li key={x.title} className="flex-1"><button type="button" aria-label={`Go to ${x.chapter}`} aria-current={k === i} onClick={() => go(k)} className="flex h-11 w-full items-center"><span className={`h-1.5 w-full rounded-full ${k <= i ? "bg-amethyst" : "bg-ink/15"}`} /></button></li>))}</ol>
      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="inline-flex h-11 items-center rounded-capsule border border-ink px-4 text-sm disabled:opacity-40">Back</button>
        <p className="font-mono text-[11px] text-graphite">Space or arrow keys. Esc closes.</p>
        <button type="button" onClick={() => (i === STEPS.length - 1 ? setOpen(false) : go(i + 1))} className="inline-flex h-11 items-center rounded-capsule bg-amethyst-deep px-4 text-sm text-white hover:bg-amethyst">{i === STEPS.length - 1 ? "Finish" : "Next"}</button>
      </div>
    </div>
  );
}
