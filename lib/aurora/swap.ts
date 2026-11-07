// Aurora Swap API client (server only; the API key never reaches the browser).
// Endpoints verified against docs.intents.aurora.dev/api-reference/swap-api-reference on 2026-11-07.
const base = () => process.env.AURORA_BASE_URL || "https://intents-api.aurora.dev";
const key = () => {
  const k = process.env.AURORA_API_KEY;
  if (!k) throw new AuroraError("aurora_not_configured", 503);
  return k;
};

export class AuroraError extends Error {
  constructor(message: string, public status: number, public body?: unknown) { super(message); }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${base()}${path}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  const text = await r.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  if (!r.ok) throw new AuroraError(`aurora_${r.status}`, r.status, body);
  return body as T;
}

export type Token = { assetId: string; decimals: number; blockchain?: string; symbol?: string; price?: number };
export const getTokens = () => call<{ tokens: Token[] }>(`/api/tokens/${key()}`);

export type QuoteInput = {
  dry: boolean; swapType?: "EXACT_INPUT" | "EXACT_OUTPUT" | "FLEX_INPUT" | "ANY_INPUT";
  originAsset: string; destinationAsset: string; amount: string; slippageTolerance?: number;
  recipient: string; refundTo: string; confidentiality?: "public" | "basic" | "advanced"; deadline?: string;
};
export type QuoteResponse = {
  timestamp: string; signature: string; correlationId: string;
  quote: { depositAddress?: string; depositMemo?: string; amountIn: string; amountInFormatted: string; amountOut: string; amountOutFormatted: string; minAmountIn?: string; timeEstimate?: number; deadline?: string; refundFee?: string; withdrawFee?: string };
};

export function buildQuoteBody(q: QuoteInput) {
  const confidential = q.confidentiality && q.confidentiality !== "public";
  return {
    dry: q.dry,
    swapType: q.swapType ?? "EXACT_INPUT",
    depositType: "ORIGIN_CHAIN" as const,
    amount: q.amount,
    originAsset: q.originAsset,
    destinationAsset: q.destinationAsset,
    slippageTolerance: q.slippageTolerance ?? 100,
    refundTo: q.refundTo,
    refundType: "ORIGIN_CHAIN" as const, // refund address is always set
    recipient: q.recipient,
    recipientType: "DESTINATION_CHAIN" as const,
    deadline: q.deadline ?? new Date(Date.now() + 30 * 60_000).toISOString(),
    ...(confidential ? { confidentiality: q.confidentiality } : {}),
  };
}

export const quote = (q: QuoteInput) => call<QuoteResponse>(`/api/quote/${key()}`, { method: "POST", body: JSON.stringify(buildQuoteBody(q)) });
export const submitDeposit = (b: { txHash: string; depositAddress: string; memo?: string }) => call<unknown>(`/api/deposit/submit/${key()}`, { method: "POST", body: JSON.stringify(b) });
export const swapStatus = (depositAddress: string, memo?: string) =>
  call<{ status: string; swapDetails?: Record<string, unknown>; updatedAt?: string }>(`/api/status/${key()}?depositAddress=${encodeURIComponent(depositAddress)}${memo ? `&depositMemo=${encodeURIComponent(memo)}` : ""}`);
