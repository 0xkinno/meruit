"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { address as toAddress, createSolanaRpc } from "@solana/kit";
import { findAssociatedTokenPda, getTransferCheckedInstruction, getCreateAssociatedTokenIdempotentInstruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { useWallet } from "./WalletProvider";
import { GlowCard } from "./GlowCard";
import { formatUsdc } from "@/lib/billing/meter";
import { usdcMint } from "@/lib/channels/constants";
import { sendInstructions } from "@/lib/solana/send";
import { screenFor, type Screen } from "@/lib/aurora/status";

const RPC = process.env.NEXT_PUBLIC_RESCUE_RPC || (process.env.NEXT_PUBLIC_NETWORK === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
const CONF = process.env.NEXT_PUBLIC_CONFIDENTIAL === "on"; // shown only when the probe confirmed it on our key
const SEND_LIVE = process.env.NEXT_PUBLIC_NETWORK !== "devnet"; // Aurora flows are mainnet only

type Addr = { depositAddress: string; memo?: string; kind: "persistent" | "single_use"; note?: string };
type Job = { id: string; state: string; cap: string; charge?: string; refund?: string; createdAt: number };

function tone(s: Screen) {
  return s.tone === "success" ? "border-mint bg-mint/20" : s.tone === "failure" ? "border-ember bg-ember/10" : s.tone === "attention" ? "border-ember bg-ember/10" : "border-ink/30 bg-paper";
}

export function Tab() {
  const { address, signer } = useWallet();
  const [usdc, setUsdc] = useState<bigint | null>(null);
  const [sol, setSol] = useState<bigint | null>(null);
  const [chain, setChain] = useState<"tron" | "evm">("tron");
  const [private_, setPrivate] = useState(false);
  const [addr, setAddr] = useState<Addr | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<Screen | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);

  // Exit flow
  const [to, setTo] = useState<"base" | "tron">("base");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1.00");
  const [preview, setPreview] = useState<{ out: string; fee?: string } | null>(null);
  const [exit, setExit] = useState<{ depositAddress: string; sig?: string; screen?: Screen } | null>(null);

  const refreshBalances = useCallback(async () => {
    if (!address) return;
    const rpc = createSolanaRpc(RPC);
    try {
      setSol((await rpc.getBalance(toAddress(address)).send()).value);
      const [ata] = await findAssociatedTokenPda({ owner: toAddress(address), mint: toAddress(usdcMint()), tokenProgram: TOKEN_PROGRAM_ADDRESS });
      const b = await rpc.getTokenAccountBalance(ata).send().catch(() => null);
      setUsdc(b ? BigInt(b.value.amount) : 0n);
    } catch { setUsdc(null); }
  }, [address]);
  useEffect(() => { refreshBalances(); }, [refreshBalances]);

  useEffect(() => {
    let ids: string[] = [];
    try { ids = JSON.parse(window.localStorage.getItem("meruit:jobs") ?? "[]"); } catch { /* none */ }
    Promise.all(ids.slice(0, 20).map((id) => fetch(`/api/jobs/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null))).then((x) => setJobs(x.filter(Boolean) as Job[]));
  }, []);

  const getAddress = async () => {
    if (!address) return;
    setBusy(true); setErr(null); setAddr(null); setStatus(null);
    try {
      const r = await fetch("/api/aurora/deposit-address", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ solana: address, chain, confidential: CONF && private_ }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error === "aurora_not_configured" ? "Funding from other chains is not switched on for this deployment yet." : j.error ?? "Could not get an address.");
      setAddr(j); setQr(await QRCode.toDataURL(j.depositAddress, { margin: 1, width: 224, color: { dark: "#171128", light: "#FBF9FF" } }));
      setStatus(screenFor("PENDING_DEPOSIT"));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!addr) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/aurora/deposit-status?address=${encodeURIComponent(addr.depositAddress)}&kind=${addr.kind}${addr.memo ? `&memo=${encodeURIComponent(addr.memo)}` : ""}`);
        const j = await r.json();
        if (!stop && r.ok) { setStatus(j.screen ?? screenFor(j.status)); if (j.status === "SUCCESS") refreshBalances(); }
      } catch { /* keep the last screen */ }
    };
    const t = setInterval(tick, 10000); tick();
    return () => { stop = true; clearInterval(t); };
  }, [addr, refreshBalances]);

  const atomic = (v: string) => { const [w, f = ""] = v.trim().split("."); return BigInt(w || "0") * 1_000_000n + BigInt((f + "000000").slice(0, 6)); };

  const quoteExit = async (dry: boolean) => {
    if (!address) return null;
    const r = await fetch("/api/aurora/exit-quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ solana: address, to, recipient, amount: atomic(amount).toString(), dry, confidential: CONF && private_ }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error === "aurora_not_configured" ? "Taking money to another chain is not switched on for this deployment yet." : j.error ?? "Could not get a quote.");
    return j as { quote: { depositAddress?: string; amountOutFormatted: string; withdrawFee?: string } };
  };

  const doPreview = async () => { setErr(null); setPreview(null); try { const q = await quoteExit(true); if (q) setPreview({ out: q.quote.amountOutFormatted, fee: q.quote.withdrawFee }); } catch (e) { setErr((e as Error).message); } };

  const doExit = async () => {
    if (!signer || !address) return;
    setBusy(true); setErr(null);
    try {
      const q = await quoteExit(false);
      const dep = q?.quote.depositAddress; if (!dep) throw new Error("No deposit address was returned.");
      const mint = toAddress(usdcMint());
      const [src] = await findAssociatedTokenPda({ owner: toAddress(address), mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
      const [dst] = await findAssociatedTokenPda({ owner: toAddress(dep), mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
      const ixs = [
        getCreateAssociatedTokenIdempotentInstruction({ payer: signer, ata: dst, owner: toAddress(dep), mint }),
        getTransferCheckedInstruction({ source: src, mint, destination: dst, authority: signer, amount: atomic(amount), decimals: 6 }),
      ];
      const sig = await sendInstructions(signer, ixs, RPC);
      await fetch("/api/aurora/exit-status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txHash: sig, depositAddress: dep }) }).catch(() => undefined);
      setExit({ depositAddress: dep, sig, screen: screenFor("PENDING_DEPOSIT") });
      refreshBalances();
    } catch (e) { setErr(/reject|denied|cancel/i.test((e as Error).message) ? "You declined in your wallet. Nothing was sent." : (e as Error).message); } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!exit || exit.screen?.terminal) return;
    const t = setInterval(async () => {
      try { const r = await fetch(`/api/aurora/exit-status?depositAddress=${encodeURIComponent(exit.depositAddress)}`); const j = await r.json(); if (r.ok) setExit((x) => (x ? { ...x, screen: j.screen } : x)); } catch { /* keep */ }
    }, 10000);
    return () => clearInterval(t);
  }, [exit]);

  return (
    <main id="main" className="pb-8 pt-10" data-testid="tab">
      <p className="label-mono">Tab</p>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Your money, in one place.</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <GlowCard className="p-6 lg:col-span-1">
          <p className="label-mono">Balance</p>
          <p className="mt-2 font-display text-5xl font-semibold" data-testid="usdc-balance">{address ? (usdc === null ? "..." : `$${formatUsdc(usdc)}`) : "Connect"}</p>
          <p className="mt-1 text-sm text-graphite">USDC on Solana</p>
          {address && sol !== null && <p className="mt-1 font-mono text-xs text-graphite">{sol.toString()} lamports for network fees</p>}
          <Link href="/studio" className="mt-5 inline-flex h-11 items-center rounded-capsule bg-amethyst-deep px-4 text-sm text-white hover:bg-amethyst">Caption a clip</Link>
        </GlowCard>

        <GlowCard className="p-6 lg:col-span-2">
          <h2 className="font-display text-2xl font-semibold">Bring money from another chain</h2>
          {!SEND_LIVE && <p className="mt-2 text-sm text-graphite">Funding from other chains runs on mainnet only. This deployment is on devnet.</p>}
          <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Chain">
            {([["tron", "Tron (USDT)"], ["evm", "Base, Arbitrum, BNB Chain, Ethereum"]] as const).map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={chain === id} onClick={() => { setChain(id); setAddr(null); }} className={`inline-flex min-h-11 items-center rounded-capsule border px-4 text-sm ${chain === id ? "border-ink bg-amethyst-deep text-white" : "border-ink/40 bg-paper hover:bg-vellum"}`}>{label}</button>
            ))}
          </div>
          {CONF && <label className="mt-4 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={private_} onChange={(e) => setPrivate(e.target.checked)} className="h-5 w-5" /> Keep my top-up private</label>}
          <button type="button" data-testid="get-address" disabled={!address || busy || !SEND_LIVE} onClick={getAddress} className="mt-4 inline-flex h-12 items-center rounded-capsule bg-amethyst-deep px-6 font-medium text-white hover:bg-amethyst disabled:opacity-60">{address ? "Show my address" : "Connect a wallet first"}</button>
          {addr && (
            <div className="mt-6 grid gap-5 sm:grid-cols-[auto_1fr]" data-testid="deposit-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr && <img src={qr} alt={`QR code for ${addr.depositAddress}`} width={224} height={224} className="rounded-xl border border-ink" />}
              <div className="min-w-0">
                <p className="label-mono">{addr.kind === "persistent" ? "Your address, yours to keep" : "Single-use address: send once, to this address only"}</p>
                <p className="mt-1 break-all font-mono text-sm" data-testid="deposit-address">{addr.depositAddress}</p>
                {addr.memo && <p className="mt-2 text-sm"><strong>Memo required:</strong> <span className="font-mono">{addr.memo}</span></p>}
                <button type="button" onClick={() => navigator.clipboard?.writeText(addr.depositAddress)} className="mt-3 inline-flex h-11 items-center rounded-capsule border border-ink px-4 text-sm hover:bg-paper">Copy address</button>
                {status && (
                  <div className={`mt-4 rounded-xl border p-3 ${tone(status)}`} role="status" data-testid="deposit-status">
                    <p className="font-medium">{status.title}</p><p className="text-sm text-graphite">{status.body}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <p className="mt-6 text-sm text-graphite">Powered by Aurora Intents.</p>
        </GlowCard>
      </div>

      <GlowCard className="mt-6 p-6">
        <h2 className="font-display text-2xl font-semibold">Jobs</h2>
        {jobs.length === 0 ? <p className="mt-2 text-graphite">No jobs yet from this browser.</p> : (
          <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Jobs table"><table className="w-full min-w-[480px] text-left text-sm"><thead className="label-mono"><tr><th className="py-2">Job</th><th>Cap</th><th>Charged</th><th>Returned</th><th /></tr></thead>
            <tbody>{jobs.map((j) => (<tr key={j.id} className="border-t hairline"><td className="py-2 font-mono text-xs">{j.id.slice(0, 12)}</td><td>${formatUsdc(BigInt(j.cap))}</td><td>{j.charge ? `$${formatUsdc(BigInt(j.charge))}` : "..."}</td><td>{j.refund ? `$${formatUsdc(BigInt(j.refund))}` : "..."}</td><td><Link className="inline-flex h-11 items-center text-amethyst-deep underline" href={`/receipt/${j.id}`}>Receipt</Link></td></tr>))}</tbody></table></div>
        )}
      </GlowCard>

      <GlowCard className="mt-6 p-6">
        <h2 className="font-display text-2xl font-semibold">Take money to another chain</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Send to<select value={to} onChange={(e) => setTo(e.target.value as "base" | "tron")} className="mt-1 h-11 w-full rounded-capsule border border-ink/40 bg-white px-3"><option value="base">Base (USDC)</option><option value="tron">Tron (USDT)</option></select></label>
          <label className="text-sm sm:col-span-1">Address there<input value={recipient} onChange={(e) => setRecipient(e.target.value)} className="mt-1 h-11 w-full rounded-capsule border border-ink/40 bg-white px-3 font-mono text-xs" placeholder={to === "base" ? "0x..." : "T..."} /></label>
          <label className="text-sm">Amount (USDC)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 h-11 w-full rounded-capsule border border-ink/40 bg-white px-3" /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={doPreview} disabled={!address || !recipient || !SEND_LIVE} className="inline-flex h-12 items-center rounded-capsule border border-ink bg-paper px-5 hover:bg-vellum disabled:opacity-60">Preview</button>
          <button type="button" data-testid="exit-send" onClick={doExit} disabled={!signer || !preview || busy || !SEND_LIVE} className="inline-flex h-12 items-center rounded-capsule bg-amethyst-deep px-6 font-medium text-white hover:bg-amethyst disabled:opacity-60">Send from my wallet</button>
        </div>
        {preview && <p className="mt-3 text-sm" data-testid="exit-preview">You would receive about <strong>{preview.out}</strong>{preview.fee ? `, after a network fee` : ""}.</p>}
        {exit?.screen && (<div className={`mt-4 rounded-xl border p-3 ${tone(exit.screen)}`} role="status"><p className="font-medium">{exit.screen.title}</p><p className="text-sm text-graphite">{exit.screen.body}</p></div>)}
      </GlowCard>

      {err && <p role="alert" data-testid="tab-error" className="mt-6 rounded-xl border border-ember bg-ember/10 p-3 text-sm text-ember-ink">{err}</p>}
    </main>
  );
}
