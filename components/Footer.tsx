import Link from "next/link";
import { Mark, Wordmark } from "./Mark";

const REPO = "https://github.com/0xkinno/meruit";

export function Footer() {
  return (
    <footer className="mt-24 border-t hairline bg-vellum/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 text-ink"><Mark /> <Wordmark /></div>
          <p className="mt-3 max-w-xs text-sm text-graphite">Built on Solana payment-channels, x402 and Aurora Intents.</p>
        </div>
        <ul className="space-y-1 text-sm">
          <li><Link className="inline-flex h-11 items-center text-ink underline-offset-4 hover:underline" href="/judge">For judges</Link></li>
          <li><Link className="inline-flex h-11 items-center text-ink underline-offset-4 hover:underline" href="/proof">Proof</Link></li>
          <li><Link className="inline-flex h-11 items-center text-ink underline-offset-4 hover:underline" href="/status">Status</Link></li>
          <li><a className="inline-flex h-11 items-center text-ink underline-offset-4 hover:underline" href={REPO} target="_blank" rel="noreferrer">Repository</a></li>
        </ul>
        <p className="text-xs leading-relaxed text-graphite">
          The demo seller is operated by the builder. Groq Whisper is the demo seller&apos;s upstream model, not a sponsor product.
          Spoken tour audio, where present, is synthetic. Live spending is capped at $0.25 per job and $1 per wallet per day. USDC has a freeze authority; see the risk notes. MIT licence.
        </p>
      </div>
    </footer>
  );
}
