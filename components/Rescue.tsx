"use client";
import { useCallback, useEffect, useState } from "react";
import { address as toAddress } from "@solana/kit";
import { useWallet } from "./WalletProvider";
import { GlowCard } from "./GlowCard";
import { escapeInstruction, humanStep, nextEscapeStep, readChannel, rpcFor, type ChannelView, type EscapeStep } from "@/lib/channels/escape";
import { findChannelsByPayer } from "@/lib/channels/discover";
import { explorerTx } from "@/lib/channels/constants";
import { formatUsdc } from "@/lib/billing/meter";
import { sendInstructions } from "@/lib/solana/send";

// Reads the chain directly from the browser. No Meruit API route is called anywhere on this page,
// so it keeps working when /api/* is down. The RPC is public by default.
const RPC = process.env.NEXT_PUBLIC_RESCUE_RPC || (process.env.NEXT_PUBLIC_NETWORK === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
const STEP_BUTTON: Record<string, string> = { request_close: "Ask to close this job", seal: "Lock the job", withdraw: "Take my money back" };

export function Rescue() {
  const { signer, address } = useWallet();
  const [views, setViews] = useState<ChannelView[]>([]);
  const [manual, setManual] = useState("");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string; sig?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000); return () => clearInterval(t); }, []);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try { setViews(await findChannelsByPayer(rpcFor(RPC), address)); } catch (e) { setNote({ tone: "bad", text: `Could not read the chain: ${(e as Error).message}` }); } finally { setLoading(false); }
  }, [address]);
  useEffect(() => { refresh(); }, [refresh]);

  const addManual = async () => {
    try { const v = await readChannel(rpcFor(RPC), toAddress(manual.trim())); if (!v) setNote({ tone: "bad", text: "No job found at that address on this network." }); else setViews((x) => [v, ...x.filter((y) => y.id !== v.id)]); }
    catch { setNote({ tone: "bad", text: "That does not look like a job address." }); }
  };

  const act = async (v: ChannelView, step: EscapeStep) => {
    if (!signer) return;
    setBusy(v.id); setNote(null);
    try {
      const ix = await escapeInstruction(step, signer, v);
      const sig = await sendInstructions(signer, [ix], RPC);
      setNote({ tone: "ok", text: "Done.", sig });
      await refresh();
    } catch (e) {
      const m = (e as Error).message;
      setNote({ tone: "bad", text: /reject|denied|cancel/i.test(m) ? "You declined in your wallet. Nothing changed." : `That did not go through: ${m.slice(0, 160)}` });
    } finally { setBusy(null); }
  };

  return (
    <main id="main" className="pb-8 pt-10" data-testid="rescue">
      <p className="label-mono">Get my money back</p>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Your money, from your wallet alone.</h1>
      <p className="mt-4 max-w-2xl text-graphite">This page reads the Solana network directly and signs with your wallet. It does not call Meruit&apos;s servers, so it works even if they are gone.</p>

      {!address && <GlowCard className="mt-8 p-6"><p>Connect the wallet you used for the job. We will look up your open jobs on the network.</p></GlowCard>}
      {address && (
        <div className="mt-8 space-y-6">
          {loading && <p role="status" className="font-mono text-xs text-graphite">Reading the network</p>}
          {!loading && views.length === 0 && <GlowCard className="p-6"><p>No jobs found for this wallet. If you have a job address, paste it below.</p></GlowCard>}
          {views.map((v) => {
            const step = nextEscapeStep(v, now);
            return (
              <GlowCard key={v.id} className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="label-mono">Job</p><p className="font-mono text-xs break-all">{v.id}</p></div>
                  <span className="rounded-full border border-ink px-3 py-1 font-mono text-xs uppercase" data-testid="channel-status">{v.status}</span>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div><dt className="label-mono">Ceiling</dt><dd className="font-display text-2xl">${formatUsdc(v.deposit)}</dd></div>
                  <div><dt className="label-mono">Charged</dt><dd className="font-display text-2xl">${formatUsdc(v.settled)}</dd></div>
                  <div><dt className="label-mono">You can take back</dt><dd className="font-display text-2xl text-mint-ink">${formatUsdc(v.refundable)}</dd></div>
                </dl>
                <p className="mt-4" data-testid="step-text">{humanStep(step)}</p>
                {step.kind === "wait" && <p className="mt-1 font-mono text-sm" data-testid="countdown">{String(Math.floor(step.secondsLeft / 60)).padStart(2, "0")}:{String(step.secondsLeft % 60).padStart(2, "0")}</p>}
                {(step.kind === "request_close" || step.kind === "seal" || step.kind === "withdraw") && (
                  <button type="button" data-testid="escape-action" disabled={busy === v.id} onClick={() => act(v, step)} className="mt-4 inline-flex h-12 items-center rounded-capsule bg-amethyst-deep px-6 font-medium text-white hover:bg-amethyst disabled:opacity-60">
                    {busy === v.id ? "Waiting for your wallet" : STEP_BUTTON[step.kind]}
                  </button>
                )}
              </GlowCard>
            );
          })}
          <GlowCard className="p-6">
            <label className="label-mono" htmlFor="manual">Have a job address?</label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input id="manual" value={manual} onChange={(e) => setManual(e.target.value)} className="h-11 min-w-0 flex-1 rounded-capsule border border-ink/40 bg-white px-3 font-mono text-xs" placeholder="Paste the job address" />
              <button type="button" onClick={addManual} className="inline-flex h-11 items-center rounded-capsule border border-ink px-4 text-sm hover:bg-paper">Look up</button>
            </div>
          </GlowCard>
          {note && (
            <p role="status" className={`rounded-xl border p-3 text-sm ${note.tone === "ok" ? "border-mint bg-mint/20 text-ink" : "border-ember bg-ember/10 text-ember-ink"}`}>
              {note.text} {note.sig && <a className="underline" href={explorerTx(note.sig)} target="_blank" rel="noreferrer">View the transaction</a>}
            </p>
          )}
          <p className="text-xs text-graphite">You pay the network fee from your own wallet. It is a fraction of a cent.</p>
        </div>
      )}
    </main>
  );
}
