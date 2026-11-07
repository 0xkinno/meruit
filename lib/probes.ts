// Measured probes. Every value comes from a call made in this process, with a timestamp.
import { address, createSolanaRpc } from "@solana/kit";
import { list } from "@vercel/blob";
import { getKV, backendName } from "./store";
import { PAYMENT_CHANNELS_PROGRAM, networkName } from "./channels/constants";
import { rpcUrl } from "./x402/server";
import { liveOn } from "./guard";
import { activeSabotage, sabotageLabel } from "./sabotage";

export type Probe = { name: string; ok: boolean | null; detail: string; ms: number; at: string };

async function timed(name: string, fn: () => Promise<string | { ok: boolean; detail: string }>): Promise<Probe> {
  const t0 = Date.now();
  try {
    const r = await fn();
    const o = typeof r === "string" ? { ok: true, detail: r } : r;
    return { name, ok: o.ok, detail: o.detail, ms: Date.now() - t0, at: new Date().toISOString() };
  } catch (e) {
    return { name, ok: false, detail: (e as Error).message.slice(0, 160), ms: Date.now() - t0, at: new Date().toISOString() };
  }
}
const skip = (name: string, why: string): Probe => ({ name, ok: null, detail: `not configured: ${why}`, ms: 0, at: new Date().toISOString() });

export async function runProbes(): Promise<Probe[]> {
  const rpc = createSolanaRpc(rpcUrl());
  const probes: Promise<Probe>[] = [
    timed("solana_rpc", async () => `slot ${(await rpc.getSlot().send()).toString()} on ${networkName()}`),
    timed("payment_channels_program", async () => {
      const a = await rpc.getAccountInfo(address(PAYMENT_CHANNELS_PROGRAM), { encoding: "base64" }).send();
      return a.value?.executable ? { ok: true, detail: `executable account present on ${networkName()}` } : { ok: false, detail: `program missing on ${networkName()}` };
    }),
    process.env.MERUIT_FEE_PAYER_KEY
      ? timed("fee_payer_balance", async () => {
          const { base58 } = await import("@scure/base");
          const pub = base58.encode(Buffer.from(base58.decode(process.env.MERUIT_FEE_PAYER_KEY!)).subarray(32));
          const b = await rpc.getBalance(address(pub)).send();
          const sol = b.value;
          return { ok: sol >= 5_000_000n, detail: `${sol.toString()} lamports (${pub.slice(0, 4)}...${pub.slice(-4)})` };
        })
      : Promise.resolve(skip("fee_payer_balance", "MERUIT_FEE_PAYER_KEY")),
    process.env.GROQ_API_KEY
      ? timed("groq", async () => { const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}` } }); return { ok: r.ok, detail: `HTTP ${r.status}` }; })
      : Promise.resolve(skip("groq", "GROQ_API_KEY")),
    process.env.AURORA_API_KEY
      ? timed("aurora_api", async () => { const r = await fetch(`${process.env.AURORA_BASE_URL || "https://intents-api.aurora.dev"}/api/tokens/${process.env.AURORA_API_KEY}`, { cache: "no-store" }); return { ok: r.ok, detail: `tokens HTTP ${r.status}` }; })
      : Promise.resolve(skip("aurora_api", "AURORA_API_KEY")),
    backendName() === "unconfigured"
      ? Promise.resolve(skip("redis", "KV_REST_API_URL"))
      : timed("redis", async () => ({ ok: await getKV().ping(), detail: `backend ${backendName()}` })),
    process.env.BLOB_READ_WRITE_TOKEN
      ? timed("blob", async () => { const r = await list({ limit: 1 }); return { ok: true, detail: `reachable, ${r.blobs.length} sample object(s)` }; })
      : Promise.resolve(skip("blob", "BLOB_READ_WRITE_TOKEN")),
    backendName() === "unconfigured"
      ? Promise.resolve(skip("sweeper_last_run", "store"))
      : timed("sweeper_last_run", async () => {
          const last = await getKV().get<{ at: string; closed: number }>("meruit:sweeper:last");
          return last ? { ok: Date.now() - Date.parse(last.at) < 30 * 60_000, detail: `last run ${last.at}` } : { ok: false, detail: "never run" };
        }),
  ];
  const out = await Promise.all(probes);
  out.push({ name: "live_switch", ok: liveOn(), detail: liveOn() ? "on" : "off (kill switch active)", ms: 0, at: new Date().toISOString() });
  out.push({ name: "sabotage", ok: true, detail: sabotageLabel(activeSabotage()), ms: 0, at: new Date().toISOString() });
  return out;
}
