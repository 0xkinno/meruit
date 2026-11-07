/**
 * Picks 20 public-domain LibriVox recordings with a seeded draw from an archive.org listing and writes
 * data/wild/SOURCES.md. Commit the output BEFORE running scripts/run-wild.ts, so nobody hand-picked the clips.
 * Usage: tsx scripts/pick-wild.ts [seed]
 */
import { mkdirSync, writeFileSync } from "node:fs";

const SEED = process.argv[2] ?? "meruit-2026-11-wild";
const N = 20;
const CLIP_SECONDS = 120;

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

async function main() {
  const q = encodeURIComponent("collection:librivoxaudio AND mediatype:audio AND language:eng");
  const r = await fetch(`https://archive.org/advancedsearch.php?q=${q}&fl%5B%5D=identifier&fl%5B%5D=title&rows=400&sort%5B%5D=identifier+asc&output=json`);
  const listing = ((await r.json()) as { response: { docs: { identifier: string; title: string }[] } }).response.docs;
  const rand = rng(SEED);
  const order = listing.map((d, i) => ({ d, k: rand() + i * 0 })).sort((a, b) => a.k - b.k).map((x) => x.d);
  const picked: { id: string; title: string; file: string; length: number; license: string }[] = [];
  for (const d of order) {
    if (picked.length >= N) break;
    const m = (await (await fetch(`https://archive.org/metadata/${d.identifier}`)).json()) as { metadata?: { licenseurl?: string }; files?: { name: string; format?: string; length?: string; source?: string }[] };
    const lic = m.metadata?.licenseurl ?? "";
    if (!/publicdomain/i.test(lic)) continue; // only recordings marked public domain
    const f = (m.files ?? []).find((x) => x.name.endsWith(".mp3") && x.source === "original" && Number(x.length ?? 0) > CLIP_SECONDS + 30 && !/64kb|sample/i.test(x.name));
    if (!f) continue;
    picked.push({ id: d.identifier, title: d.title, file: f.name, length: Number(f.length), license: lic });
  }
  const md = [
    "# Wild set sources", "",
    `Seed: \`${SEED}\`. Selection: seeded shuffle of the first 400 English LibriVox audio items on archive.org sorted by identifier; the first ${N} whose metadata carries a public domain licence URL and an original mp3 longer than ${CLIP_SECONDS + 30} s.`,
    `Each job uses the first ${CLIP_SECONDS} seconds of the file. Nobody chose these clips by hand.`, "",
    "| # | Item | File | Source length (s) | Licence |", "|---|---|---|---|---|",
    ...picked.map((p, i) => `| ${i + 1} | [${p.title.replace(/\|/g, "/")}](https://archive.org/details/${p.id}) | \`${p.file}\` | ${Math.round(p.length)} | ${p.license} |`), "",
    "```json", JSON.stringify({ seed: SEED, clipSeconds: CLIP_SECONDS, items: picked.map((p) => ({ id: p.id, file: p.file })) }), "```", "",
  ].join("\n");
  mkdirSync("data/wild", { recursive: true });
  writeFileSync("data/wild/SOURCES.md", md);
  console.log(`picked ${picked.length} of ${N}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
