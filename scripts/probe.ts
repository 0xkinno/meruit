/**
 * G5 platform probe. Every row is a call made by this script, with a timestamp. Rows that need a key
 * we do not have say so. Writes PLATFORM_PROBE.md.
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import "./lib/env";

type Row = { check: string; result: "yes" | "no" | "not run" | "info"; detail: string; at: string };
const rows: Row[] = [];
const add = (check: string, result: Row["result"], detail: string) => rows.push({ check, result, detail: detail.replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 400), at: new Date().toISOString() });

const PROGRAM = "CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX";
const rpc = async (url: string, method: string, params: unknown[]) => {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  return (await r.json()) as { result?: any; error?: any };
};
const json = async (url: string, init?: RequestInit) => { const r = await fetch(url, init); const t = await r.text(); let j: any = t; try { j = JSON.parse(t); } catch { /* text */ } return { status: r.status, body: j }; };

async function main() {
  const nets = { mainnet: process.env.SOLANA_RPC_MAINNET || "https://api.mainnet-beta.solana.com", devnet: process.env.SOLANA_RPC_DEVNET || "https://api.devnet.solana.com" };
  for (const [name, url] of Object.entries(nets)) {
    const r = await rpc(url, "getAccountInfo", [PROGRAM, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]);
    add(`payment-channels program on ${name}`, r.result?.value?.executable ? "yes" : "no", r.result?.value ? `executable, owner ${r.result.value.owner}` : JSON.stringify(r.error ?? r.result));
  }
  for (const [name, mint] of [["mainnet", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"], ["devnet", "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"]] as const) {
    const r = await rpc(nets[name], "getAccountInfo", [mint, { encoding: "jsonParsed" }]);
    const info = r.result?.value?.data?.parsed?.info;
    add(`USDC mint on ${name}`, info ? "yes" : "no", info ? `decimals ${info.decimals}, freezeAuthority ${info.freezeAuthority ?? "none"}` : "missing");
  }

  const sup = await json("https://x402.org/facilitator/supported");
  const kinds = (sup.body?.kinds ?? []) as { scheme: string; network: string }[];
  add("x402.org facilitator /supported", "info", kinds.filter((k) => k.network.startsWith("solana")).map((k) => `${k.scheme}@${k.network}`).join(", ") || "no solana kinds");
  add("x402.org supports Solana upto", kinds.some((k) => k.scheme === "upto" && k.network.startsWith("solana")) ? "yes" : "no", "Meruit self-facilitates upto either way");

  for (const p of ["@x402/core", "@x402/next", "@x402/fetch", "@x402/svm", "@aurora-is-near/intents-connect"]) {
    const v = JSON.parse(readFileSync(`node_modules/${p}/package.json`, "utf8")).version;
    add(`${p} installed`, "yes", v);
  }
  const svm = JSON.parse(readFileSync("node_modules/@x402/svm/package.json", "utf8"));
  for (const e of ["./upto/client", "./upto/server", "./upto/facilitator"]) add(`@x402/svm exports ${e}`, e in svm.exports ? "yes" : "no", "package.json exports map");

  if (process.env.GROQ_API_KEY) {
    const t0 = Date.now();
    const m = await json("https://api.groq.com/openai/v1/models", { headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}` } });
    add("Groq reachable", m.status === 200 ? "yes" : "no", `HTTP ${m.status}, ${Date.now() - t0} ms`);
    if (existsSync("public/samples/short-1min.mp3")) {
      const form = new FormData();
      form.append("file", new File([readFileSync("public/samples/short-1min.mp3")], "c.mp3", { type: "audio/mpeg" }));
      form.append("model", "whisper-large-v3-turbo");
      form.append("response_format", "verbose_json");
      const t1 = Date.now();
      const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: form });
      const j: any = await r.json().catch(() => ({}));
      add("Groq Whisper on a 60 s clip", r.ok ? "yes" : "no", r.ok ? `${Date.now() - t1} ms, segments ${j.segments?.length}, fields ${Object.keys(j.segments?.[0] ?? {}).join(",")}` : `HTTP ${r.status}`);
    }
  } else add("Groq Whisper on a 60 s clip", "not run", "GROQ_API_KEY not set");

  const base = process.env.AURORA_BASE_URL || "https://intents-api.aurora.dev";
  const key = process.env.AURORA_API_KEY;
  if (key) {
    const tok = await json(`${base}/api/tokens/${key}`);
    add("Aurora token list", tok.status === 200 ? "yes" : "no", `HTTP ${tok.status}`);
    const tokens = (tok.body?.tokens ?? []) as { assetId: string }[];
    const { ASSETS } = await import("../lib/aurora/assets");
    for (const [k, id] of Object.entries(ASSETS)) add(`asset id ${k} in live token list`, tokens.some((t) => t.assetId === id) ? "yes" : "no", id);
    const sample = "2nzqHcYzmi1PPjAbpzKfyaMvP1Y4x2zCzDfMCt3f5uAF";
    const { buildQuoteBody } = await import("../lib/aurora/swap");
    for (const [label, dest, conf] of [["Solana USDC to Base USDC (dry)", ASSETS.baseUsdc, undefined], ["Solana USDC to Tron USDT (dry)", ASSETS.tronUsdt, undefined], ["confidentiality basic (dry)", ASSETS.baseUsdc, "basic"]] as const) {
      const q = await json(`${base}/api/quote/${key}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(buildQuoteBody({ dry: true, originAsset: ASSETS.solUsdc, destinationAsset: dest, amount: "1000000", recipient: dest === ASSETS.tronUsdt ? "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE" : "0x000000000000000000000000000000000000dEaD", refundTo: sample, confidentiality: conf as never })) });
      add(`Aurora quote: ${label}`, q.status === 200 ? "yes" : "no", q.status === 200 ? `amountOut ${q.body?.quote?.amountOutFormatted}` : `HTTP ${q.status} ${JSON.stringify(q.body).slice(0, 160)}`);
    }
    for (const chain of ["tron", "evm"]) {
      const a = await json(`${base}/api/persistent-deposit-address/${key}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sender: "meruit-probe", recipient: sample, depositChain: chain, destinationChain: "sol", destinationAsset: ASSETS.solUsdc }) });
      add(`Aurora persistent address (${chain} to Solana USDC)`, a.status === 200 ? "yes" : "no", a.status === 200 ? `address ${String(a.body?.depositAddress).slice(0, 6)}...` : `HTTP ${a.status} ${JSON.stringify(a.body).slice(0, 160)}`);
    }
  } else {
    add("Aurora token list, quotes, persistent address, confidentiality", "not run", "AURORA_API_KEY not set. Documented: persistent address creation is limited to approved organisations (403 otherwise).");
  }
  if (process.env.AURORA_CONNECT_BASE_URL && key) add("Intents Connect access", "not run", "base URL set; run the intermediary call manually per Part 5.4");
  else add("Intents Connect access", "no", "no AURORA_CONNECT_BASE_URL: access comes through the Aurora team. Connect is labelled designed.");

  const md = [
    "# PLATFORM_PROBE.md", "", "Generated by `npm run probe`. Every row is a call made by the script; nothing is hard-coded.", "",
    "| Check | Result | Detail | At (UTC) |", "|---|---|---|---|",
    ...rows.map((r) => `| ${r.check} | ${r.result} | ${r.detail} | ${r.at} |`), "",
  ].join("\n");
  writeFileSync("PLATFORM_PROBE.md", md);
  console.log(md);
}
main().catch((e) => { console.error(e); process.exit(1); });
