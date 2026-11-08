/**
 * Builds docs/recorded/hero-run.json (shown on /judge) from a real run file in runs/live/.
 * Usage: tsx scripts/make-recording.ts runs/live/<job>.json
 * The page labels it "Recorded live run, <date>, <network>". Nothing here is invented: cues, amounts and the
 * settlement signature all come from the run file.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) { console.error("usage: tsx scripts/make-recording.ts runs/live/<job>.json"); process.exit(2); }
const run = JSON.parse(readFileSync(file, "utf8"));
if (!run.cueList?.length || !run.paymentResponse?.transaction) { console.error("run has no cues or no settlement signature"); process.exit(1); }
mkdirSync("docs/recorded", { recursive: true });
writeFileSync("docs/recorded/hero-run.json", JSON.stringify({
  recordedAt: run.at, network: run.network, video: "/samples/hero-12min.mp4",
  cues: run.cueList, cap: run.cap, charge: run.charge, refund: run.refund,
  signatures: { settle: run.paymentResponse.transaction },
}, null, 1) + "\n");
console.log(`recorded ${run.cueList.length} cues, settle ${run.paymentResponse.transaction.slice(0, 12)}...`);
