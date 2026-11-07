// Minimal Wallet Standard adapter: discover wallets, connect, and wrap an account as a kit signer.
import { getWallets } from "@wallet-standard/app";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { address, getTransactionDecoder, getTransactionEncoder, type Address, type TransactionPartialSigner } from "@solana/kit";

export type SolanaChain = "solana:mainnet" | "solana:devnet";

const needs = ["standard:connect", "solana:signTransaction"];
export const supportsMeruit = (w: Wallet) => needs.every((f) => f in w.features) && w.chains.some((c) => c.startsWith("solana:"));

export function listWallets(): Wallet[] {
  return getWallets().get().filter(supportsMeruit);
}
export function onWalletsChange(cb: () => void): () => void {
  const { on } = getWallets();
  const off1 = on("register", cb);
  const off2 = on("unregister", cb);
  return () => {
    off1();
    off2();
  };
}

type ConnectFeature = { connect(i?: { silent?: boolean }): Promise<{ accounts: readonly WalletAccount[] }> };
type DisconnectFeature = { disconnect(): Promise<void> };
type SignFeature = { signTransaction(...i: { account: WalletAccount; transaction: Uint8Array; chain?: string }[]): Promise<{ signedTransaction: Uint8Array }[]> };

export async function connectWallet(w: Wallet, silent = false): Promise<WalletAccount | null> {
  const f = w.features["standard:connect"] as ConnectFeature;
  const { accounts } = await f.connect({ silent });
  return accounts.find((a) => a.chains.some((c) => c.startsWith("solana:"))) ?? null;
}
export async function disconnectWallet(w: Wallet): Promise<void> {
  const f = w.features["standard:disconnect"] as DisconnectFeature | undefined;
  if (f) await f.disconnect();
}

export function accountSigner(w: Wallet, account: WalletAccount, chain: SolanaChain): TransactionPartialSigner {
  const addr = address(account.address) as Address;
  const sign = (w.features["solana:signTransaction"] as SignFeature).signTransaction;
  const encode = getTransactionEncoder();
  const decode = getTransactionDecoder();
  return {
    address: addr,
    signTransactions: async (txs) => {
      const out = [];
      for (const tx of txs) {
        const [res] = await sign({ account, transaction: new Uint8Array(encode.encode(tx)), chain });
        const signed = decode.decode(res.signedTransaction);
        const mine = signed.signatures[addr];
        if (!mine) throw new Error("wallet_did_not_sign");
        out.push(Object.freeze({ [addr]: mine }));
      }
      return out as never;
    },
  };
}
