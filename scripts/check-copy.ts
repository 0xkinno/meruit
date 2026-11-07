/**
 * House style for copy shown to people: no emoji, no em or en dashes, no hype words.
 * Scans README and docs markdown, app and component source strings. Ignores code identifiers by only
 * flagging the banned characters everywhere and banned words in text files and JSX/string literals.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components", "lib/aurora/status.ts", "lib/x402/describe.ts", "lib/channels/escape.ts", "README.md", "docs", "JUDGE.md", "RISK.md", "DESIGN.md", "DISCOVERY.md", "THESIS.md", "MOMENT.md", "PROGRESS.md", "FINDINGS.md", "FRICTION_REPORT.md", "SPONSOR_INTEL.md", "SDK_SURFACE.md", "EVIDENCE.md", "PROOF.md", "MILESTONES.md", "DECK.md", "SUBMISSION_ENCODE.md", "PLATFORM_PROBE.md", "LANE_MAP.md", "PROOF_PLAN.md", "RULES_EXTRACT.md"];
const SKIP = ["docs/sources", ".next", "node_modules"];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
const DASH = /[–—]/;
const WORDS = /\b(revolutionary|seamless|seamlessly|cutting-edge|game-changing|game changer|leverage|leverages|unleash|supercharge|next-gen|world-class|best-in-class|robust solution|empower|empowers|delve|elevate|unlock the power)\b/i;

function files(p: string): string[] {
  let st; try { st = statSync(p); } catch { return []; }
  if (SKIP.some((s) => p.includes(s))) return [];
  if (st.isDirectory()) return readdirSync(p).flatMap((n) => files(join(p, n)));
  return /\.(md|tsx?|json|svg)$/.test(p) && !p.endsWith("FACTS.json") ? [p] : [];
}

let bad = 0;
for (const f of ROOTS.flatMap(files)) {
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    const hit = EMOJI.test(line) ? "emoji" : DASH.test(line) ? "dash" : WORDS.test(line) ? "banned word" : null;
    if (hit) { bad++; console.log(`${f}:${i + 1}: ${hit}: ${line.trim().slice(0, 100)}`); }
  });
}
console.log(bad ? `${bad} house-style violation(s)` : "house style clean");
process.exit(bad ? 1 : 0);
