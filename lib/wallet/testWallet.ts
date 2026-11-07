// Test-only Wallet Standard wallet backed by a keypair. Registered only when NEXT_PUBLIC_E2E=1 on preview
// builds (see components/WalletProvider.tsx). It follows the same code path as Phantom. Never in production.
import { registerWallet } from "@wallet-standard/wallet";
import { base58 } from "@scure/base";
import { createKeyPairSignerFromBytes, createKeyPairFromBytes, getTransactionDecoder, getTransactionEncoder, signTransaction } from "@solana/kit";
import type { Wallet, WalletAccount } from "@wallet-standard/base";

let registered = false;

export async function registerTestWallet(secretB58: string, opts: { rejectNext?: () => boolean } = {}): Promise<void> {
  if (registered) return;
  registered = true;
  const bytes = base58.decode(secretB58);
  const signer = await createKeyPairSignerFromBytes(bytes);
  const keyPair = await createKeyPairFromBytes(bytes);
  const account = {
    address: signer.address,
    publicKey: bytes.slice(32),
    chains: ["solana:devnet", "solana:mainnet"],
    features: ["solana:signTransaction"],
    label: "Test wallet",
  } as unknown as WalletAccount;
  const wallet = {
    version: "1.0.0",
    name: "Meruit Test Wallet",
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIvPg==",
    chains: ["solana:devnet", "solana:mainnet"],
    accounts: [account],
    features: {
      "standard:connect": { version: "1.0.0", connect: async () => ({ accounts: [account] }) },
      "standard:disconnect": { version: "1.0.0", disconnect: async () => undefined },
      "standard:events": { version: "1.0.0", on: () => () => undefined },
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signTransaction: async (...inputs: { transaction: Uint8Array }[]) => {
          if (opts.rejectNext?.()) throw new Error("User rejected the request.");
          const out = [];
          for (const i of inputs) {
            const tx = getTransactionDecoder().decode(i.transaction);
            const signed = await signTransaction([keyPair], tx);
            out.push({ signedTransaction: new Uint8Array(getTransactionEncoder().encode(signed)) });
          }
          return out;
        },
      },
    },
  } as unknown as Wallet;
  registerWallet(wallet);
}
