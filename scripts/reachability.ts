/**
 * Curls every public path of a deployment and fails if any returns a non-2xx status.
 * Usage: tsx scripts/reachability.ts [baseUrl]
 */
const base = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const paths = [
  "/", "/studio", "/tab", "/proof", "/judge", "/status", "/sell",
  "/api/status", "/api/stats",
];

async function main() {
  let failed = 0;
  for (const p of paths) {
    const started = Date.now();
    try {
      const r = await fetch(base + p, { redirect: "follow" });
      const ok = r.status >= 200 && r.status < 300;
      if (!ok) failed++;
      console.log(`${ok ? "PASS" : "FAIL"} ${r.status} ${p} ${Date.now() - started}ms`);
    } catch (e) {
      failed++;
      console.log(`FAIL ERR ${p} ${(e as Error).message}`);
    }
  }
  console.log(failed === 0 ? `all ${paths.length} paths reachable at ${base}` : `${failed} path(s) failed at ${base}`);
  process.exit(failed === 0 ? 0 : 1);
}
main();
