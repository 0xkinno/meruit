// Find the channels a wallet opened, straight from chain (getProgramAccounts with a payer memcmp). No Meruit API.
import { address, type Rpc, type SolanaRpcApi, getBase58Decoder, getAddressEncoder } from "@solana/kit";
import { getChannelDecoder } from "./generated/accounts/channel";
import { PAYMENT_CHANNELS_PROGRAM } from "./constants";
import { viewChannel, type ChannelView } from "./escape";

/** Layout: discriminator, version, bump, status (1 each) + salt 8 + deposit 8 + settlement 16 + two i64 + grace u32 + hash 32. */
export const PAYER_OFFSET = 1 + 1 + 1 + 1 + 8 + 8 + 16 + 8 + 8 + 4 + 32;
export const CHANNEL_SIZE = 256;

export async function findChannelsByPayer(rpc: Rpc<SolanaRpcApi>, payer: string): Promise<ChannelView[]> {
  const bytes = getAddressEncoder().encode(address(payer));
  const b58 = getBase58Decoder().decode(bytes);
  const res = await rpc.getProgramAccounts(address(PAYMENT_CHANNELS_PROGRAM), {
    encoding: "base64",
    filters: [{ dataSize: BigInt(CHANNEL_SIZE) }, { memcmp: { offset: BigInt(PAYER_OFFSET), bytes: b58 as never, encoding: "base58" } }],
  }).send();
  const decoder = getChannelDecoder();
  const out: ChannelView[] = [];
  for (const acct of res) {
    const raw = Uint8Array.from(atob(acct.account.data[0]), (c) => c.charCodeAt(0));
    try { out.push(viewChannel(String(acct.pubkey), decoder.decode(raw))); } catch { /* not a channel layout */ }
  }
  return out.sort((a, b) => (a.openSlot < b.openSlot ? 1 : a.openSlot > b.openSlot ? -1 : 0));
}
