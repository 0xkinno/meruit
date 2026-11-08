/**
 * Hands specific channels to the SDK's rent cleanup manager so the fee payer recovers their rent:
 * a sealed channel is distributed and closed, a distributed one is reclaimed once its slot window has passed.
 * For channels whose store row was lost (for example after a local restart). In production the Redis store
 * remembers them and /api/cron/sweep does this on a schedule.
 * Usage: tsx scripts/cleanup-channels.ts <channelId> [channelId...]
 */
import { base58 } from "@scure/base";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { toFacilitatorSvmSigner } from "@x402/svm";
import { InMemoryPaymentChannelStorage, UptoSvmRentCleanupManager } from "@x402/svm/upto/facilitator";
import { need, rpcUrl } from "./lib/env";
import { caip2, TOKEN_PROGRAM } from "../lib/channels/constants";
import { readChannel, rpcFor } from "../lib/channels/escape";

async function main() {
  const ids = process.argv.slice(2);
  if (!ids.length) { console.error("usage: tsx scripts/cleanup-channels.ts <channelId> [...]"); process.exit(2); }
  const feePayer = await createKeyPairSignerFromBytes(base58.decode(need("MERUIT_FEE_PAYER_KEY")));
  const network = caip2() as `${string}:${string}`;
  const storage = new InMemoryPaymentChannelStorage();
  for (const id of ids) {
    const v = await readChannel(rpcFor(rpcUrl()), id);
    console.log(id.slice(0, 8), v ? `status ${v.status}` : "account gone (already closed)");
    if (!v) continue;
    await storage.recordOpen({ network, channelId: id, payTo: need("MERUIT_PAY_TO"), tokenProgram: TOKEN_PROGRAM, expiresAt: 0, lastActivityAt: Date.now(), receiverAuthorizer: "", callerIdentity: "" });
  }
  const mgr = new UptoSvmRentCleanupManager({ signer: toFacilitatorSvmSigner(feePayer, { defaultRpcUrl: rpcUrl() }), storage, network });
  await mgr.cleanup({
    abandonGraceSecs: 0,
    onClose: (r: any) => console.log(`${r.action} ${r.channelId.slice(0, 8)} ${r.transaction}`),
    onReclaim: (r: any) => console.log(`reclaim ${r.channelIds.map((c: string) => c.slice(0, 8)).join(",")} ${r.transaction}`),
    onError: (e: unknown) => console.log("error", e instanceof Error ? e.message : e),
  } as never);
  for (const id of ids) console.log(id.slice(0, 8), "now", (await readChannel(rpcFor(rpcUrl()), id))?.status ?? "closed");
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
