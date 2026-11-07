import { config } from "dotenv";
import { existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) if (existsSync(f)) config({ path: f, override: false });

export const need = (name: string): string => {
  const v = process.env[name];
  if (!v) { console.error(`Missing ${name}. Set it in .env.local (see .env.example).`); process.exit(2); }
  return v;
};
export const network = (): "mainnet" | "devnet" => (process.env.NEXT_PUBLIC_NETWORK === "devnet" ? "devnet" : "mainnet");
export const rpcUrl = () => (network() === "devnet" ? process.env.SOLANA_RPC_DEVNET : process.env.SOLANA_RPC_MAINNET) || (network() === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
