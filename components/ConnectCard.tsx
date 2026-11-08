"use client";
import { useState } from "react";
import { useWallet } from "./WalletProvider";
import { GlowCard } from "./GlowCard";
import { BASE_CHAIN_ID_HEX, BASE_USDC_ADDRESS, MIN_BRIDGE_ATOMIC, buildBridgeInBody, erc20TransferData, secp256k1Envelope } from "@/lib/aurora/connectSteps";
import { formatUsdc } from "@/lib/billing/meter";

type Eth = { request(a: { method: string; params?: unknown[] }): Promise<unknown> };
const eth = (): Eth | null => (typeof window !== "undefined" ? ((window as unknown as { ethereum?: Eth }).ethereum ?? null) : null);
const PROXY = "/api/aurora/connect";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${PROXY}${path}`, { ...init, headers: { "content-type": "application/json" } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? `request failed (${r.status})`);
  return j as T;
}

const toAtomic = (v: string) => { const [w, f = ""] = v.trim().split("."); return BigInt(w || "0") * 1_000_000n + BigInt((f + "000000").slice(0, 6)); };

/** One signature from an EVM wallet turns Base USDC into spendable Solana USDC in the connected Solana wallet. */
export function ConnectCard() {
  const { address: solana } = useWallet();
  const [amount, setAmount] = useState("0.50");
  const [from, setFrom] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ out: string; fee: string } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const say = (m: string) => setLog((l) => [...l, m]);

  const connectEvm = async () => {
    setErr(null);
    const p = eth();
    if (!p) { setErr("No EVM wallet found in this browser. Install MetaMask or open this page in a wallet browser."); return null; }
    try {
      const accts = (await p.request({ method: "eth_requestAccounts" })) as string[];
      await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_CHAIN_ID_HEX }] });
      setFrom(accts[0]);
      return accts[0];
    } catch (e) { setErr((e as Error).message || "Could not connect."); return null; }
  };

  const quote = async () => {
    if (!solana) return setErr("Connect your Solana wallet first. The money arrives there.");
    setBusy(true); setErr(null); setPreview(null);
    try {
      const evm = from ?? (await connectEvm());
      if (!evm) return;
      const atomic = toAtomic(amount);
      if (atomic < MIN_BRIDGE_ATOMIC) throw new Error(`The smallest amount that leaves anything after fees is $${formatUsdc(MIN_BRIDGE_ATOMIC)}.`);
      const im = await api<{ result: { solana: string | null } }>(`/api/v1/executions/${evm}/intermediary`);
      if (!im.result.solana) throw new Error("Solana is not available for this wallet right now.");
      const body = await buildBridgeInBody({ intermediarySolana: im.result.solana, buyer: solana, amountAtomic: atomic.toString(), dry: true });
      const r = await api<{ result: { quote: { amountOut: string }; details: { networkFee: string } } }>(`/api/v1/executions/${evm}`, { method: "POST", body: JSON.stringify(body) });
      const out = BigInt(r.result.quote.amountOut);
      setPreview({ out: formatUsdc(out, 2), fee: formatUsdc(atomic - out, 2) });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const run = async () => {
    const p = eth();
    if (!p || !from || !solana) return;
    setBusy(true); setErr(null); setLog([]);
    try {
      const atomic = toAtomic(amount);
      const im = await api<{ result: { solana: string } }>(`/api/v1/executions/${from}/intermediary`);
      const body = await buildBridgeInBody({ intermediarySolana: im.result.solana, buyer: solana, amountAtomic: atomic.toString() });
      say("Asking Aurora to prepare the transfer");
      type Created = { id: string; quote: { depositAddress: string; amountIn: string }; details: { payload: { payload_json: string } } };
      const created = (await api<{ result: Created }>(`/api/v1/executions/${from}`, { method: "POST", body: JSON.stringify(body) })).result;
      const message = created.details.payload.payload_json;
      say("Waiting for your one signature");
      const sig = (await p.request({ method: "personal_sign", params: [message, from] })) as string;
      await api(`/api/v1/executions/${from}/submit`, { method: "POST", body: JSON.stringify({ signature: secp256k1Envelope(sig), executionId: created.id }) });
      say("Signed. Now send the USDC from your wallet");
      const depositAddress = created.quote.depositAddress;
      const txHash = (await p.request({ method: "eth_sendTransaction", params: [{ from, to: BASE_USDC_ADDRESS, data: erc20TransferData(depositAddress, BigInt(created.quote.amountIn)) }] })) as string;
      say("Sent. Waiting for it to arrive in your Solana wallet");
      await api(`/api/v1/executions/deposit/submit`, { method: "POST", body: JSON.stringify({ txHash, depositAddress }) }).catch(() => undefined);
    } catch (e) {
      const m = (e as Error).message;
      setErr(/reject|denied|cancel/i.test(m) ? "You declined in your wallet. Nothing was sent." : m);
    } finally { setBusy(false); }
  };

  return (
    <GlowCard className="mt-6 p-6">
      <h2 className="font-display text-2xl font-semibold">One signature from an EVM wallet</h2>
      <p className="mt-2 text-sm text-graphite">Have USDC on Base? Sign once and it arrives in your Solana wallet, ready to spend. Aurora Intents Connect runs the Solana side for you. Amounts under about $0.30 leave nothing after fees, and the first time you use it a one-time account fee applies.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">USDC to send<input inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setPreview(null); }} className="mt-1 block h-11 w-32 rounded-capsule border border-ink/40 bg-white px-3" /></label>
        <button type="button" onClick={quote} disabled={busy || !solana} className="inline-flex h-12 items-center rounded-capsule border border-ink bg-paper px-5 hover:bg-vellum disabled:opacity-60" data-testid="connect-preview">{from ? "Preview" : "Connect EVM wallet and preview"}</button>
        <button type="button" onClick={run} disabled={busy || !preview} className="inline-flex h-12 items-center rounded-capsule bg-amethyst-deep px-6 font-medium text-white hover:bg-amethyst disabled:opacity-60" data-testid="connect-run">Sign and send</button>
      </div>
      {!solana && <p className="mt-3 text-sm text-graphite">Connect your Solana wallet at the top first.</p>}
      {preview && <p className="mt-3 text-sm" data-testid="connect-quote">You send ${amount}. You receive about <strong>${preview.out}</strong> USDC on Solana after about ${preview.fee} in fees.</p>}
      {log.length > 0 && <ul className="mt-3 space-y-1 text-sm" aria-live="polite">{log.map((l) => <li key={l}>{l}</li>)}</ul>}
      {err && <p role="alert" className="mt-3 rounded-xl border border-ember bg-ember/10 p-3 text-sm text-ember-ink">{err}</p>}
      <p className="mt-4 text-xs text-graphite">Powered by Aurora Intents Connect.</p>
    </GlowCard>
  );
}
