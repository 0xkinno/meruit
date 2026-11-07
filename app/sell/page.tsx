import type { Metadata } from "next";
import { GlowCard } from "@/components/GlowCard";

export const metadata: Metadata = { title: "Sell this way" };

const CODE = `// One route, charged for what was delivered.
const POST = withX402(handler, {
  "POST /api/your-tool": {
    accepts: [{ scheme: "upto", price: ctx => ceilingFor(ctx), network, payTo }],
  },
}, server);

async function handler(req) {
  const delivered = await doTheWork(req);          // minutes, tokens, pages
  const res = Response.json(delivered.output);
  setSettlementOverrides(res, { amount: priceFor(delivered) }); // charge, not ceiling
  return res;                                     // the rest returns to the buyer
}`;

export default function Sell() {
  return (
    <main id="main" className="pb-8 pt-10">
      <p className="label-mono">Sell this way</p>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Charge for what you delivered.</h1>
      <p className="mt-3 max-w-2xl text-graphite">Meruit is one seller using one pattern. Any per-use tool can use the same route shape: the buyer signs a ceiling, you deliver, you settle the real amount, and the unused part goes back in the same settlement.</p>
      <GlowCard className="mt-8 p-6">
        <pre tabIndex={0} aria-label="Example route code" className="overflow-x-auto font-mono text-xs leading-relaxed"><code>{CODE}</code></pre>
      </GlowCard>
      <p className="mt-4 text-sm text-graphite">This page shows the pattern the live route in this repository uses. A hosted door for third-party sellers and an agent-facing tool are not built yet and are not claimed.</p>
    </main>
  );
}
