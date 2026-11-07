import type { Address } from "@solana/kit";

export const MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export const DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
export const PAYMENT_CHANNELS_PROGRAM = "CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX" as Address;
export const ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address;
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as Address;
export const USDC_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const OPEN_SLOT_WINDOW = 1500;

export type NetworkName = "mainnet" | "devnet";
export const networkName = (): NetworkName => (process.env.NEXT_PUBLIC_NETWORK === "devnet" ? "devnet" : "mainnet");
export const caip2 = (n: NetworkName = networkName()) => (n === "devnet" ? DEVNET : MAINNET);
export const usdcMint = (n: NetworkName = networkName()) => (n === "devnet" ? USDC_DEVNET : USDC_MAINNET);
export const explorerTx = (sig: string, n: NetworkName = networkName()) =>
  `https://explorer.solana.com/tx/${sig}${n === "devnet" ? "?cluster=devnet" : ""}`;
export const explorerAddr = (a: string, n: NetworkName = networkName()) =>
  `https://explorer.solana.com/address/${a}${n === "devnet" ? "?cluster=devnet" : ""}`;
