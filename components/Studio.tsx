"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useWallet } from "./WalletProvider";
import { GlowCard } from "./GlowCard";
import { decodeToChunks } from "@/lib/transcribe/chunk";
import { makePayingFetch } from "@/lib/x402/client";
import type { Approval } from "@/lib/x402/describe";
import { cuesFromChunks, toSrt, toVtt, type Cue, type Segment } from "@/lib/srt";
import { capForSeconds, formatUsdc, mmss } from "@/lib/billing/meter";

const SAMPLES = [
  { id: "short", label: "One minute", file: "/samples/short-1min.mp3", seconds: 60, video: null as string | null },
  { id: "mid", label: "Three minutes", file: "/samples/mid-3min.mp3", seconds: 180, video: null },
  { id: "hero", label: "Twelve minute interview", file: "/samples/hero-12min.mp3", seconds: 720, video: "/samples/hero-12min.mp4" },
];

type Stage = "idle" | "preparing" | "uploading" | "approving" | "delivering" | "done" | "refused" | "failed";
type ChunkResult = { index: number; ok: boolean; seconds: number; segments: Segment[]; error?: string };
type JobResult = { jobId: string; results: ChunkResult[]; deliveredSeconds: number; declaredSeconds: number; cap: string; charge: string; refund: string; failedChunks: number[] };

const STEPS = ["Add clip", "Approve ceiling", "Captions", "Review", "Export"];
const rpc = () => process.env.NEXT_PUBLIC_RPC_URL || (process.env.NEXT_PUBLIC_NETWORK === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
const newJobId = () => `job_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function Studio() {
  const { signer, address } = useWallet();
  const [sampleId, setSampleId] = useState("hero");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [result, setResult] = useState<JobResult | null>(null);
  const [cues, setCues] = useState<Cue[]>([]);
  const [time, setTime] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  const decision = useRef<((ok: boolean) => void) | null>(null);
  const media = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  const sample = SAMPLES.find((s) => s.id === sampleId)!;
  const declared = file ? 0 : sample.seconds;
  const capPreview = useMemo(() => { try { return declared ? capForSeconds(declared) : null; } catch { return null; } }, [declared]);
  const step = stage === "idle" || stage === "preparing" || stage === "uploading" ? 1 : stage === "approving" ? 2 : stage === "delivering" ? 3 : stage === "done" ? (editing !== null || cues.some((c) => c.check) ? 4 : 5) : 1;
  const active = cues.find((c) => time >= c.start && time <= c.end);
  const live = process.env.NEXT_PUBLIC_LIVE !== "off";

  useEffect(() => { try { if (new URLSearchParams(window.location.search).get("tour") === "1") window.dispatchEvent(new Event("meruit:tour")); } catch { /* ignore */ } }, []);

  const run = useCallback(async () => {
    setMessage(null); setResult(null); setCues([]);
    if (!signer || !address) { setMessage("Connect a wallet first. It signs the ceiling for this job."); return; }
    try {
      setStage("preparing");
      const blob = file ?? (await (await fetch(sample.file)).blob());
      const { chunks, totalSeconds } = await decodeToChunks(blob, setProgress);
      let cap: bigint;
      try { cap = capForSeconds(totalSeconds); } catch { setStage("failed"); setMessage("That clip is longer than the public limit of 25 minutes ($0.25 per job)."); return; }
      const jobId = newJobId();

      setStage("uploading");
      const uploaded: { url: string; seconds: number }[] = [];
      for (const c of chunks) {
        setProgress(`Uploading part ${c.index + 1} of ${chunks.length}`);
        const b = await upload(`chunks/${jobId}/${c.index}.wav`, new Blob([c.wav as BlobPart], { type: "audio/wav" }), { access: "public", handleUploadUrl: "/api/blob/upload", contentType: "audio/wav" });
        uploaded.push({ url: b.url, seconds: c.seconds });
      }

      setStage("approving"); setProgress("");
      const payingFetch = makePayingFetch(signer, rpc(), totalSeconds, (a) => new Promise<boolean>((resolve) => { decision.current = resolve; setApproval(a); }));
      const res = await payingFetch("/api/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json", "x-meruit-seconds": String(totalSeconds), "x-meruit-job": jobId, "x-meruit-wallet": address },
        body: JSON.stringify({ jobId, chunks: uploaded }),
      });
      setApproval(null);
      if (res.status === 402) { setStage("refused"); setMessage("The payment was not accepted. Nothing was charged."); return; }
      if (res.status === 503) { setStage("failed"); setMessage("Meruit did not answer. If a ceiling was approved, you can take your money back from your own wallet."); return; }
      if (!res.ok) { const j = await res.json().catch(() => ({})); setStage("failed"); setMessage(j.message ?? "The job did not complete. Nothing was charged beyond what was delivered."); return; }
      setStage("delivering");
      const data = (await res.json()) as JobResult;
      // Report the settlement signature, if the response carried one, so the receipt can link it.
      try {
        const raw = res.headers.get("payment-response");
        if (raw) {
          const pr = JSON.parse(atob(raw)) as { transaction?: string; payer?: string };
          if (pr.transaction) await fetch(`/api/jobs/${jobId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: "settled", signature: pr.transaction, payer: address, paymentResponse: pr }) });
        }
      } catch { /* the receipt still shows server-side state */ }
      setResult(data); setCues(cuesFromChunks(data.results)); setStage("done");
    } catch (e) {
      const m = (e as Error).message ?? "";
      setApproval(null);
      if (/reject|abort|cancel|denied/i.test(m)) { setStage("refused"); setMessage("You declined, so no job was opened and nothing was charged."); }
      else { setStage("failed"); setMessage(m || "Something went wrong. Nothing was charged."); }
    }
  }, [signer, address, file, sample]);

  const seek = (c: Cue, play = false) => { const m = media.current; if (!m) return; m.currentTime = c.start; if (play) m.play().catch(() => undefined); };
  const edit = (id: number, text: string) => setCues((cs) => cs.map((c) => (c.id === id ? { ...c, text, edited: true, check: c.check && false } : c)));
  const checks = cues.filter((c) => c.check).length;

  return (
    <main id="main" className="pb-8 pt-10" data-testid="studio">
      <p className="label-mono">Studio</p>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Caption a clip.</h1>
      <ol className="mt-6 flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={step === i + 1 ? "step" : undefined} className={`inline-flex h-11 items-center gap-2 rounded-capsule border px-3 text-sm ${step === i + 1 ? "border-ink bg-amethyst-deep text-white" : step > i + 1 ? "border-ink/30 bg-vellum text-ink" : "border-ink/20 text-graphite"}`}>
            <span className="font-mono text-xs">{i + 1}</span>{s}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section aria-label="Player">
          <GlowCard className="p-4 sm:p-5">
            <div className="relative overflow-hidden rounded-xl border border-ink/30 bg-ink">
              {sample.video && !file ? (
                <video ref={(n) => { media.current = n; }} src={sample.video} controls playsInline preload="metadata" className="aspect-video w-full" onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} data-testid="player" />
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-end bg-gradient-to-b from-ink to-[#2a1d4a] p-4">
                  <audio ref={(n) => { media.current = n; }} src={file ? URL.createObjectURL(file) : sample.file} controls preload="metadata" className="w-full" onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} data-testid="player" />
                </div>
              )}
              {active && (
                <p aria-live="polite" data-testid="caption-overlay" className="pointer-events-none absolute inset-x-3 bottom-14 mx-auto w-fit max-w-[92%] rounded-lg bg-ink/80 px-3 py-2 text-center text-base text-white sm:text-lg">{active.text}</p>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-ink/20 bg-paper p-4" data-testid="meter-rail">
              <p className="label-mono">Meter</p>
              {result ? (
                <p className="mt-1 font-mono text-sm">delivered {mmss(result.deliveredSeconds)} of {mmss(result.declaredSeconds)}, charged ${formatUsdc(BigInt(result.charge))}, cap ${formatUsdc(BigInt(result.cap))}</p>
              ) : (
                <p className="mt-1 font-mono text-sm text-graphite">{capPreview !== null ? `cap $${formatUsdc(capPreview)} for ${mmss(declared)}, charged only for delivered minutes` : "pick a clip to see the ceiling"}</p>
              )}
              {result && (
                <div className="mt-3 flex h-3 overflow-hidden rounded-full border border-ink/40" aria-hidden>
                  <div className="bg-amethyst" style={{ width: `${(Number(BigInt(result.charge) * 1000n / BigInt(result.cap)) / 10)}%` }} />
                  <div className="flex-1 bg-mint" />
                </div>
              )}
              {result && <p className="mt-2 text-sm text-graphite">Returned to you: <strong className="text-mint-ink">${formatUsdc(BigInt(result.refund))}</strong></p>}
            </div>
          </GlowCard>

          <GlowCard className="mt-6 p-5">
            <h2 className="font-display text-2xl font-semibold">1. Add a clip</h2>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Sample clips">
              {SAMPLES.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={!file && sampleId === s.id} onClick={() => { setFile(null); setSampleId(s.id); setStage("idle"); setResult(null); setCues([]); }} className={`inline-flex h-11 items-center rounded-capsule border px-4 text-sm ${!file && sampleId === s.id ? "border-ink bg-amethyst-deep text-white" : "border-ink/40 bg-paper hover:bg-vellum"}`}>{s.label}</button>
              ))}
              <label className="inline-flex h-11 cursor-pointer items-center rounded-capsule border border-dashed border-ink/50 bg-paper px-4 text-sm hover:bg-vellum">
                Upload audio or video
                <input type="file" accept="audio/*,video/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setStage("idle"); } }} />
              </label>
            </div>
            <p className="mt-3 text-sm text-graphite">Sample clips are public domain recordings from LibriVox. Longest job: 25 minutes.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" data-testid="start" disabled={!live || ["preparing", "uploading", "approving", "delivering"].includes(stage)} onClick={run} className="inline-flex h-12 items-center rounded-capsule bg-amethyst-deep px-6 font-medium text-white shadow-print-sm hover:bg-amethyst disabled:opacity-60">
                {address ? "Get captions" : "Connect a wallet to start"}
              </button>
              {progress && <p role="status" className="font-mono text-xs text-graphite">{progress}</p>}
            </div>
            {message && <p role="alert" data-testid="message" className={`mt-4 rounded-xl border p-3 text-sm ${stage === "refused" ? "border-ember bg-ember/10 text-ember-ink" : "border-ember bg-ember/10 text-ember-ink"}`}>{message} {stage === "failed" && <Link className="underline" href="/rescue">Get my money back</Link>}</p>}
          </GlowCard>
        </section>

        <section aria-label="Captions">
          <GlowCard className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-semibold">Captions</h2>
              {cues.length > 0 && <p className="font-mono text-xs text-graphite" data-testid="check-count">{checks} to check</p>}
            </div>
            {cues.length === 0 ? (
              <p className="mt-3 text-graphite">{stage === "idle" ? "Captions appear here, line by line, once your ceiling is approved." : "Working on it."}</p>
            ) : (
              <ul className="mt-3 max-h-[480px] space-y-2 overflow-auto pr-1" data-testid="cues">
                {cues.map((c) => (
                  <li key={c.id} className={`rounded-xl border p-3 ${c.check ? "border-ember bg-ember/10" : active?.id === c.id ? "border-amethyst bg-paper" : "border-ink/20 bg-paper"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => seek(c)} className="inline-flex h-11 items-center font-mono text-xs text-amethyst-deep underline underline-offset-4">{mmss(c.start)}</button>
                      <div className="flex items-center gap-2">
                        {c.check && <span className="rounded-full bg-ember px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink">check</span>}
                        <button type="button" onClick={() => seek(c, true)} className="inline-flex h-11 items-center rounded-capsule border border-ink/30 px-3 text-xs hover:bg-vellum">Play this line</button>
                      </div>
                    </div>
                    {editing === c.id ? (
                      <textarea autoFocus aria-label={`Edit caption at ${mmss(c.start)}`} defaultValue={c.text} onBlur={(e) => { edit(c.id, e.target.value); setEditing(null); }} className="mt-1 w-full rounded-lg border border-ink/40 bg-white p-2 text-sm" rows={2} />
                    ) : (
                      <button type="button" onClick={() => setEditing(c.id)} className="mt-1 block min-h-11 w-full text-left text-sm" aria-label={`Edit: ${c.text}`}>{c.text}</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {cues.length > 0 && <p className="mt-3 text-xs text-graphite">Fixing a line is never billed.</p>}
          </GlowCard>

          {result && (
            <GlowCard className="mt-6 p-5" >
              <h2 className="font-display text-2xl font-semibold">5. Export</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" data-testid="export-srt" onClick={() => download("captions.srt", toSrt(cues), "application/x-subrip")} className="inline-flex h-11 items-center rounded-capsule bg-amethyst-deep px-4 text-sm text-white hover:bg-amethyst">Download .srt</button>
                <button type="button" onClick={() => download("captions.vtt", toVtt(cues), "text/vtt")} className="inline-flex h-11 items-center rounded-capsule border border-ink bg-paper px-4 text-sm hover:bg-vellum">Download .vtt</button>
                <Link href={`/receipt/${result.jobId}`} data-testid="receipt-link" className="inline-flex h-11 items-center rounded-capsule border border-ink bg-mint px-4 text-sm font-medium text-ink">See the receipt</Link>
              </div>
              {result.failedChunks.length > 0 && <p className="mt-3 text-sm text-ember-ink">Not delivered, not charged: part{result.failedChunks.length > 1 ? "s" : ""} {result.failedChunks.map((i) => i + 1).join(", ")}.</p>}
            </GlowCard>
          )}
        </section>
      </div>

      {approval && (
        <div role="dialog" aria-modal="true" aria-labelledby="approve-h" className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-card border border-ink bg-paper p-6 shadow-print">
            <p className="label-mono">2 / Approve ceiling</p>
            <h2 id="approve-h" className="mt-2 font-display text-3xl font-semibold" data-testid="approval-headline">{approval.headline}</h2>
            <ul className="mt-4 space-y-2 text-sm text-graphite">{approval.lines.map((l) => <li key={l}>{l}</li>)}</ul>
            <p className="mt-4 font-mono text-xs text-graphite" data-testid="approval-amount">Your wallet will sign: up to {approval.capText}</p>
            <div className="mt-6 flex gap-3">
              <button type="button" data-testid="approve" onClick={() => { decision.current?.(true); }} className="inline-flex h-12 flex-1 items-center justify-center rounded-capsule bg-amethyst-deep font-medium text-white hover:bg-amethyst">Approve in wallet</button>
              <button type="button" data-testid="decline" onClick={() => { decision.current?.(false); setApproval(null); }} className="inline-flex h-12 items-center justify-center rounded-capsule border border-ink px-5 hover:bg-vellum">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
