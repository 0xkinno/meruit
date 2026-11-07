// Browser x402 client using the connected wallet as the signer.
import type { TransactionSigner } from "@solana/kit";
import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { UptoSvmScheme } from "@x402/svm/upto/client";
import { describeRequirement, type Approval, type RequirementLike } from "./describe";

export type ApprovalHandler = (a: Approval) => Promise<boolean>;

/**
 * Returns a fetch that pays 402s with `upto`. Before the wallet is asked, `approve` receives the decoded
 * requirement; declining aborts with no channel opened and no charge (B10).
 */
export function makePayingFetch(signer: TransactionSigner, rpcUrl: string, declaredSeconds: number, approve: ApprovalHandler) {
  const client = new x402Client();
  client.register("solana:*", new UptoSvmScheme(signer, { rpcUrl }));
  client.onBeforePaymentCreation(async ({ selectedRequirements }) => {
    const ok = await approve(describeRequirement(selectedRequirements as unknown as RequirementLike, declaredSeconds));
    if (!ok) return { abort: true, reason: "rejected_by_buyer" };
  });
  return wrapFetchWithPayment(fetch, client);
}
