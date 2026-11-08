// Aurora Intents Connect REST client (steps on Solana). The API is open at intents-connect-api.aurora.dev;
// bridge-in additionally sends the Aurora API key in `x-api-key`. Server and scripts only.
const base = () => (process.env.AURORA_CONNECT_BASE_URL || "https://intents-connect-api.aurora.dev").replace(/\/$/, "");

export class ConnectError extends Error {
  constructor(message: string, public status: number, public body?: unknown) { super(message); }
}

async function call<T>(path: string, init: RequestInit = {}, apiKey = false): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", ...(init.headers as Record<string, string> | undefined) };
  if (apiKey) {
    if (!process.env.AURORA_API_KEY) throw new ConnectError("aurora_not_configured", 503);
    headers["x-api-key"] = process.env.AURORA_API_KEY;
  }
  const r = await fetch(`${base()}${path}`, { ...init, headers, cache: "no-store" });
  const text = await r.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  if (!r.ok) throw new ConnectError(`connect_${r.status}`, r.status, body);
  return body as T;
}

export type Intermediary = { originAccount: string; originType: string; evm?: string; solana: string | null; sui?: string };
export const getIntermediary = async (wallet: string, publicKey?: string) =>
  (await call<{ result: Intermediary }>(`/api/v1/executions/${encodeURIComponent(wallet)}/intermediary${publicKey ? `?publicKey=${encodeURIComponent(publicKey)}` : ""}`)).result;

export type SolanaStep = {
  programId: string; discriminator?: string; metadata?: { name?: string; description?: string };
  args: { name: string; type: string; value: string | number | boolean }[];
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
};

export type ExecutionBody = {
  version: "1.0"; type: "solana"; dry?: boolean; steps: SolanaStep[];
  destinationAsset?: string;
  quote?: { amount: string; deadline: string; destinationAsset: string; originAsset: string; recipient?: string; slippageTolerance: number; swapType: "EXACT_INPUT" | "EXACT_OUTPUT" | "FLEX_INPUT" };
};

/** Steps-only: the intermediary already holds the token. */
export const createSteps = (wallet: string, body: ExecutionBody) => call<{ result: Record<string, unknown> }>(`/api/v1/executions/${encodeURIComponent(wallet)}/steps`, { method: "POST", body: JSON.stringify(body) });
/** Bridge-in: bridge a token in from the origin chain and act on it, with one signature. Needs the API key. */
export const createBridgeIn = (wallet: string, body: ExecutionBody) => call<{ result: Record<string, unknown> }>(`/api/v1/executions/${encodeURIComponent(wallet)}`, { method: "POST", body: JSON.stringify(body) }, true);
export const submitSignature = (wallet: string, body: { signature: string; executionId: string; publicKey?: string }) => call<unknown>(`/api/v1/executions/${encodeURIComponent(wallet)}/submit`, { method: "POST", body: JSON.stringify(body) });
export const submitDepositHash = (body: { txHash: string; depositAddress: string; memo?: string }) => call<unknown>(`/api/v1/executions/deposit/submit`, { method: "POST", body: JSON.stringify(body) });
export const listExecutions = (wallet: string) => call<unknown>(`/api/v1/executions/${encodeURIComponent(wallet)}`);
