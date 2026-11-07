// Every Aurora terminal state has a designed screen. Plain words, no bridge vocabulary.
export type AuroraStatus = "KNOWN_DEPOSIT_TX" | "PENDING_DEPOSIT" | "INCOMPLETE_DEPOSIT" | "PROCESSING" | "SUCCESS" | "REFUNDED" | "FAILED";
export const ALL_STATUSES: AuroraStatus[] = ["KNOWN_DEPOSIT_TX", "PENDING_DEPOSIT", "INCOMPLETE_DEPOSIT", "PROCESSING", "SUCCESS", "REFUNDED", "FAILED"];

export type Screen = {
  status: AuroraStatus; tone: "waiting" | "working" | "success" | "attention" | "failure"; terminal: boolean;
  title: string; body: string; action?: string;
};

export function screenFor(status: string, ctx: { refundAddress?: string; minAmount?: string } = {}): Screen {
  switch (status as AuroraStatus) {
    case "PENDING_DEPOSIT":
      return { status: "PENDING_DEPOSIT", tone: "waiting", terminal: false, title: "Waiting for your money", body: "Send from the wallet or exchange you already use. This page updates by itself." };
    case "KNOWN_DEPOSIT_TX":
      return { status: "KNOWN_DEPOSIT_TX", tone: "working", terminal: false, title: "We saw your send", body: "It is being confirmed on the network you sent from." };
    case "PROCESSING":
      return { status: "PROCESSING", tone: "working", terminal: false, title: "On its way to Solana", body: "Your money arrived and is being delivered to your Solana wallet. This usually takes a few minutes." };
    case "SUCCESS":
      return { status: "SUCCESS", tone: "success", terminal: true, title: "Your money is here", body: "It arrived in your Solana wallet as USDC, ready to spend on jobs." };
    case "INCOMPLETE_DEPOSIT":
      return { status: "INCOMPLETE_DEPOSIT", tone: "attention", terminal: false, title: "That was a little too small", body: `The amount sent is below the minimum${ctx.minAmount ? ` of ${ctx.minAmount}` : ""}. Send the difference to the same address, or wait and it will be returned${ctx.refundAddress ? ` to ${ctx.refundAddress}` : ""}.`, action: "Send the difference" };
    case "REFUNDED":
      return { status: "REFUNDED", tone: "attention", terminal: true, title: "Your money was returned", body: `The send could not be completed, so it went back${ctx.refundAddress ? ` to ${ctx.refundAddress}` : " to the address you sent from"}. Nothing was lost.` };
    case "FAILED":
      return { status: "FAILED", tone: "failure", terminal: true, title: "This did not go through", body: "Something stopped the transfer. If you sent money, it is returned to the sending address. Keep the transaction id and contact support with it.", action: "Copy transaction id" };
    default:
      return { status: "PENDING_DEPOSIT", tone: "waiting", terminal: false, title: "Checking", body: "Looking up your transfer." };
  }
}
