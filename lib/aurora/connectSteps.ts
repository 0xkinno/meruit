// The Solana steps Meruit asks Intents Connect to run after a bridge-in: make sure the buyer's USDC account exists,
// then send the bridged USDC to the buyer with a checked transfer. Runs from the buyer's Solana intermediary.
import { address } from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { base58 } from "@scure/base";
import type { ExecutionBody, SolanaStep } from "./connectRest";
import { ASSETS } from "./assets";
import { USDC_MAINNET } from "../channels/constants";

const ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";
export const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const BASE_CHAIN_ID_HEX = "0x2105";
export const MIN_BRIDGE_ATOMIC = 300_000n; // a dry quote below about 0.30 USDC leaves nothing after fees

export async function buildBridgeInBody(args: { intermediarySolana: string; buyer: string; amountAtomic: string; dry?: boolean }): Promise<ExecutionBody> {
  const mint = address(USDC_MAINNET);
  const [srcAta] = await findAssociatedTokenPda({ owner: address(args.intermediarySolana), mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  const [buyerAta] = await findAssociatedTokenPda({ owner: address(args.buyer), mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  const steps: SolanaStep[] = [
    {
      metadata: { name: "Prepare buyer account", description: "Create the buyer's USDC account if it does not exist" },
      programId: ATA_PROGRAM, discriminator: "01", args: [],
      accounts: [
        { pubkey: "{INTERMEDIARY}", isSigner: true, isWritable: true }, { pubkey: buyerAta, isSigner: false, isWritable: true },
        { pubkey: args.buyer, isSigner: false, isWritable: false }, { pubkey: USDC_MAINNET, isSigner: false, isWritable: false },
        { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false }, { pubkey: TOKEN_PROGRAM_ADDRESS, isSigner: false, isWritable: false },
      ],
    },
    {
      metadata: { name: "Send USDC to the buyer", description: "Move the bridged USDC to the buyer's Solana wallet" },
      programId: TOKEN_PROGRAM_ADDRESS, discriminator: "0c",
      args: [{ name: "amount", type: "u64", value: "{MIN_AMOUNT_OUT}" }, { name: "decimals", type: "u8", value: 6 }],
      accounts: [
        { pubkey: srcAta, isSigner: false, isWritable: true }, { pubkey: USDC_MAINNET, isSigner: false, isWritable: false },
        { pubkey: buyerAta, isSigner: false, isWritable: true }, { pubkey: "{INTERMEDIARY}", isSigner: true, isWritable: false },
      ],
    },
  ];
  return {
    version: "1.0", type: "solana", dry: args.dry ?? false, steps,
    quote: { amount: args.amountAtomic, deadline: new Date(Date.now() + 25 * 60_000).toISOString(), destinationAsset: ASSETS.solUsdc, originAsset: ASSETS.baseUsdc, slippageTolerance: 100, swapType: "EXACT_INPUT" },
  };
}

/** erc191: personal_sign over `details.payload.payload_json` verbatim; recovery byte 27/28 becomes 0/1; base58 with a curve prefix. */
export function secp256k1Envelope(hexSignature: string): string {
  const raw = Uint8Array.from((hexSignature.replace(/^0x/, "").match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)));
  if (raw.length !== 65) throw new Error("unexpected_signature_length");
  if (raw[64] >= 27) raw[64] -= 27;
  return `secp256k1:${base58.encode(raw)}`;
}

/** ERC-20 `transfer(address,uint256)` calldata, built by hand so the browser needs no EVM library. */
export function erc20TransferData(to: string, amount: bigint): string {
  const pad = (hex: string) => hex.padStart(64, "0");
  return `0xa9059cbb${pad(to.toLowerCase().replace(/^0x/, ""))}${pad(amount.toString(16))}`;
}
