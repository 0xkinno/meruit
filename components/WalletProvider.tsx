"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import type { TransactionSigner } from "@solana/kit";
import { accountSigner, connectWallet, disconnectWallet, listWallets, onWalletsChange, type SolanaChain } from "@/lib/wallet/standard";

type Ctx = {
  wallets: Wallet[];
  wallet: Wallet | null;
  account: WalletAccount | null;
  address: string | null;
  signer: TransactionSigner | null;
  chain: SolanaChain;
  busy: boolean;
  error: string | null;
  connect: (w: Wallet) => Promise<void>;
  disconnect: () => Promise<void>;
};

const WalletCtx = createContext<Ctx | null>(null);
export const useWallet = () => {
  const c = useContext(WalletCtx);
  if (!c) throw new Error("WalletProvider missing");
  return c;
};

const KEY = "meruit:wallet";
const chain: SolanaChain = process.env.NEXT_PUBLIC_NETWORK === "devnet" ? "solana:devnet" : "solana:mainnet";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let off = () => {};
    (async () => {
      // The test wallet exists only on preview builds with NEXT_PUBLIC_E2E=1. Never in production.
      if (process.env.NEXT_PUBLIC_E2E === "1" && process.env.NEXT_PUBLIC_E2E_SECRET) {
        const { registerTestWallet } = await import("@/lib/wallet/testWallet");
        await registerTestWallet(process.env.NEXT_PUBLIC_E2E_SECRET, {
          rejectNext: () => { try { return window.sessionStorage.getItem("meruit:e2e:reject") === "1"; } catch { return false; } },
        });
      }
      const refresh = () => setWallets(listWallets());
      refresh();
      off = onWalletsChange(refresh);
    })();
    return () => off();
  }, []);

  // Silent reconnect to the last wallet.
  useEffect(() => {
    let last: string | null = null;
    try { last = window.localStorage.getItem(KEY); } catch { /* storage unavailable */ }
    if (!last || wallet) return;
    const w = wallets.find((x) => x.name === last);
    if (!w) return;
    connectWallet(w, true).then((a) => { if (a) { setWallet(w); setAccount(a); } }).catch(() => undefined);
  }, [wallets, wallet]);

  const connect = useCallback(async (w: Wallet) => {
    setBusy(true); setError(null);
    try {
      const a = await connectWallet(w);
      if (!a) throw new Error("No Solana account in this wallet.");
      setWallet(w); setAccount(a);
      try { window.localStorage.setItem(KEY, w.name); } catch { /* ignore */ }
    } catch (e) {
      setError((e as Error).message || "Could not connect.");
    } finally { setBusy(false); }
  }, []);

  const disconnect = useCallback(async () => {
    if (wallet) await disconnectWallet(wallet).catch(() => undefined);
    setWallet(null); setAccount(null);
    try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
  }, [wallet]);

  const signer = useMemo(() => (wallet && account ? (accountSigner(wallet, account, chain) as TransactionSigner) : null), [wallet, account]);
  const value: Ctx = { wallets, wallet, account, address: account?.address ?? null, signer, chain, busy, error, connect, disconnect };
  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}
