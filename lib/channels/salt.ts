// Salt grinding: choose the channel salt so both the channel PDA and its escrow ATA land on bump 255.
// Each on-chain derivation below 255 costs about 1,500 CU per bump iteration in open, topUp, distribute, withdrawPayer.
import { address, getAddressEncoder, getProgramDerivedAddress, type Address } from "@solana/kit";
import { ATA_PROGRAM, PAYMENT_CHANNELS_PROGRAM, TOKEN_PROGRAM } from "./constants";

const enc = getAddressEncoder();
const u64le = (n: bigint) => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, n, true); return b; };
const utf8 = (s: string) => new TextEncoder().encode(s);

export type ChannelSeed = { payer: string; payee: string; mint: string; authorizedSigner: string; openSlot: bigint; tokenProgram?: string };

export async function deriveChannel(seed: ChannelSeed, salt: bigint) {
  const [channel, channelBump] = await getProgramDerivedAddress({
    programAddress: PAYMENT_CHANNELS_PROGRAM,
    seeds: [utf8("channel"), enc.encode(address(seed.payer)), enc.encode(address(seed.payee)), enc.encode(address(seed.mint)), enc.encode(address(seed.authorizedSigner)), u64le(salt), u64le(seed.openSlot)],
  });
  const [escrow, escrowBump] = await getProgramDerivedAddress({
    programAddress: ATA_PROGRAM,
    seeds: [enc.encode(channel), enc.encode(address(seed.tokenProgram ?? TOKEN_PROGRAM)), enc.encode(address(seed.mint))],
  });
  return { channel: channel as Address, channelBump, escrow: escrow as Address, escrowBump };
}

/** Cost model from the program docs: about 1,500 CU for each bump step below 255, for each derivation. */
export const savedComputeUnits = (channelBump: number, escrowBump: number) => (255 - channelBump + (255 - escrowBump)) * 1500;

export async function grindSalt(seed: ChannelSeed, start: bigint = BigInt(Date.now()), maxTries = 5000) {
  for (let i = 0; i < maxTries; i++) {
    const salt = start + BigInt(i);
    const d = await deriveChannel(seed, salt);
    if (d.channelBump === 255 && d.escrowBump === 255) return { salt, tries: i + 1, ...d };
  }
  throw new Error("salt_not_found");
}
