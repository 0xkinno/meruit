/**
 * Runs the committed wild set (data/wild/SOURCES.md) as real jobs. Each clip is the first 120 s of a
 * LibriVox recording. Writes runs/wild/<job>.json. Usage: tsx scripts/run-wild.ts --base URL [--limit N]
 * Spends real funds on the configured network (about $0.02 per clip). Ask before running on mainnet.
 */
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { runJob } from "./run-job";
import "./lib/env";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined; };

async function main() {
  const base = (arg("base") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const md = readFileSync("data/wild/SOURCES.md", "utf8");
  const spec = JSON.parse(md.match(/```json\n([\s\S]*?)\n```/)![1]) as { seed: string; clipSeconds: number; items: { id: string; file: string }[] };
  const limit = Number(arg("limit") ?? spec.items.length);
  mkdirSync("runs/raw", { recursive: true });
  for (const [i, it] of spec.items.slice(0, limit).entries()) {
    const out = `runs/raw/${it.id}.mp3`;
    if (!existsSync(out)) {
      const dl = spawnSync("curl", ["-sL", "--max-time", "120", "-r", "0-1500000", "-o", out, `https://archive.org/download/${it.id}/${encodeURIComponent(it.file)}`]);
      if (dl.status !== 0) { console.log(`skip ${it.id}: download failed`); continue; }
    }
    const trimmed = `runs/raw/${it.id}.trim.mp3`;
    const ff = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", out, "-t", String(spec.clipSeconds), "-ac", "1", "-ar", "16000", "-b:a", "32k", trimmed]);
    if (ff.status !== 0) { console.log(`skip ${it.id}: ffmpeg failed`); continue; }
    console.log(`[${i + 1}/${limit}] ${it.id}`);
    await runJob({ clip: trimmed, base, out: "runs/wild", wild: true, label: "wild" });
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
