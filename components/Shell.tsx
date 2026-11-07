"use client";
import { WalletProvider } from "./WalletProvider";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Tour } from "./Tour";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] overflow-hidden">
        <div className="absolute -left-24 -top-32 h-[360px] w-[360px] rounded-full bg-ultraviolet/40 blur-[90px]" />
        <div className="absolute -right-24 -top-40 h-[360px] w-[360px] rounded-full bg-amethyst/30 blur-[90px]" />
      </div>
      <Navbar />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{children}</div>
      <Footer />
      <Tour />
    </WalletProvider>
  );
}
