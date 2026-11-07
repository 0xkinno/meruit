// The buyer's escape hatch: requestClose -> grace -> seal -> withdrawPayer.
// Reads the channel from chain directly (no Meruit API). Instruction builders come from the vendored
// payment-channels generated client. Integers only.
import {
  type Address, type Instruction, type TransactionSigner, type Rpc, type SolanaRpcApi,
  createSolanaRpc, createTransactionMessage, setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstructions, pipe,
  address,
} from "@solana/kit";
import { findAssociatedTokenPda } from "@solana-program/token";
import { fetchMaybeChannel, type Channel } from "./generated/accounts/channel";
import { ChannelStatus } from "./generated/types/channelStatus";
import { getRequestCloseInstruction } from "./generated/instructions/requestClose";
import { getSealInstruction } from "./generated/instructions/seal";
import { getWithdrawPayerInstruction } from "./generated/instructions/withdrawPayer";
import { TOKEN_PROGRAM } from "./constants";

export type EscapeStep =
  | { kind: "request_close" }
  | { kind: "wait"; secondsLeft: number }
  | { kind: "seal" }
  | { kind: "withdraw"; refund: bigint }
  | { kind: "done"; reason: "refunded" | "distributed" | "nothing_to_withdraw" }
  | { kind: "missing" };

export type ChannelView = {
  id: string;
  status: "open" | "closing" | "sealed" | "distributed";
  deposit: bigint;
  settled: bigint;
  refundable: bigint;
  closureStartedAt: bigint;
  gracePeriod: number;
  payerWithdrawnAt: bigint;
  payer: string;
  payee: string;
  mint: string;
  openSlot: bigint;
};

const statusName = (s: number): ChannelView["status"] =>
  s === ChannelStatus.Open ? "open" : s === ChannelStatus.Closing ? "closing" : s === ChannelStatus.Sealed ? "sealed" : "distributed";

export function viewChannel(id: string, c: Channel): ChannelView {
  const settled = c.settlement.settled;
  return {
    id, status: statusName(c.status), deposit: c.deposit, settled,
    refundable: c.deposit > settled ? c.deposit - settled : 0n,
    closureStartedAt: c.closureStartedAt, gracePeriod: c.gracePeriod, payerWithdrawnAt: c.payerWithdrawnAt,
    payer: c.payer, payee: c.payee, mint: c.mint, openSlot: c.openSlot,
  };
}

/** Pure: given a channel view and the current unix time, what is the next step the payer should take. */
export function nextEscapeStep(v: ChannelView | null, nowSecs: number): EscapeStep {
  if (!v) return { kind: "missing" };
  if (v.status === "open") return { kind: "request_close" };
  if (v.status === "closing") {
    const deadline = v.closureStartedAt + BigInt(v.gracePeriod);
    const left = deadline - BigInt(nowSecs);
    return left > 0n ? { kind: "wait", secondsLeft: parseInt(left.toString(), 10) } : { kind: "seal" };
  }
  if (v.status === "sealed") {
    if (v.payerWithdrawnAt > 0n) return { kind: "done", reason: "refunded" };
    if (v.refundable === 0n) return { kind: "done", reason: "nothing_to_withdraw" };
    return { kind: "withdraw", refund: v.refundable };
  }
  return { kind: "done", reason: "distributed" };
}

export async function readChannel(rpc: Rpc<SolanaRpcApi>, channelId: string): Promise<ChannelView | null> {
  const acct = await fetchMaybeChannel(rpc, address(channelId));
  return acct.exists ? viewChannel(channelId, acct.data) : null;
}
export const rpcFor = (url: string) => createSolanaRpc(url);

export function requestCloseIx(payer: TransactionSigner, channel: string): Instruction {
  return getRequestCloseInstruction({ payer, channel: address(channel) });
}
export function sealIx(channel: string): Instruction {
  return getSealInstruction({ channel: address(channel) });
}
export async function withdrawPayerIx(payer: TransactionSigner, v: Pick<ChannelView, "id" | "mint">, tokenProgram: string = TOKEN_PROGRAM): Promise<Instruction> {
  const [payerAta] = await findAssociatedTokenPda({ owner: payer.address, mint: address(v.mint), tokenProgram: address(tokenProgram) });
  const [channelAta] = await findAssociatedTokenPda({ owner: address(v.id), mint: address(v.mint), tokenProgram: address(tokenProgram) });
  return getWithdrawPayerInstruction({
    payer, channel: address(v.id), channelTokenAccount: channelAta, payerTokenAccount: payerAta,
    mint: address(v.mint), tokenProgram: address(tokenProgram),
  });
}

/**
 * Build the unsigned transaction message for one escape step. `feePayer` defaults to the buyer, so a
 * buyer with SOL needs nobody. Pass Meruit's fee payer signer to sponsor a buyer with zero SOL (labelled in the UI).
 */
export async function buildEscapeMessage(args: {
  rpc: Rpc<SolanaRpcApi>; step: EscapeStep; payer: TransactionSigner; view: ChannelView; feePayer?: TransactionSigner;
}) {
  const { rpc, step, payer, view } = args;
  let ix: Instruction;
  if (step.kind === "request_close") ix = requestCloseIx(payer, view.id);
  else if (step.kind === "seal") ix = sealIx(view.id);
  else if (step.kind === "withdraw") ix = await withdrawPayerIx(payer, view);
  else throw new Error(`no_transaction_for_step_${step.kind}`);
  const { value: blockhash } = await rpc.getLatestBlockhash().send();
  return pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(args.feePayer ?? payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions([ix], m),
  );
}

export const humanStep = (s: EscapeStep): string => {
  switch (s.kind) {
    case "request_close": return "Ask to close this job. A countdown starts.";
    case "wait": return `Waiting out the safety delay. ${Math.ceil(s.secondsLeft / 60)} min left.`;
    case "seal": return "The delay is over. Lock the job so your money can be released.";
    case "withdraw": return "Take your money back.";
    case "done": return s.reason === "refunded" ? "Your money is back in your wallet." : s.reason === "distributed" ? "This job was settled and closed. Nothing is left to take back." : "Nothing is left to take back.";
    case "missing": return "No job found at this address on this network.";
  }
};
export type { Address };
