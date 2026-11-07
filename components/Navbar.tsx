"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Mark, Wordmark } from "./Mark";
import { useWallet } from "./WalletProvider";

const LINKS = [
  { href: "/studio", label: "Studio" },
  { href: "/tab", label: "Tab" },
  { href: "/proof", label: "Proof" },
  { href: "/judge", label: "For judges" },
];

const short = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`;
const btn = "inline-flex h-11 items-center justify-center rounded-capsule px-4 text-sm font-medium transition-colors";

function PowerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M12 3v8" /><path d="M6.4 6.8a8 8 0 1 0 11.2 0" />
    </svg>
  );
}

function ConnectControl({ compact = false }: { compact?: boolean }) {
  const { wallets, address, connect, disconnect, busy, error } = useWallet();
  const [open, setOpen] = useState(false);
  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span data-testid="address-chip" className={`${btn} border border-ink bg-vellum font-mono text-xs`}>{short(address)}</span>
        <button type="button" aria-label="Disconnect wallet" data-testid="disconnect" onClick={() => disconnect()} className={`${btn} w-11 border border-ink bg-paper px-0 text-ink hover:bg-vellum`}>
          <PowerIcon />
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <button type="button" data-testid="connect" onClick={() => setOpen((v) => !v)} aria-expanded={open} disabled={busy} className={`${btn} bg-amethyst-deep text-white hover:bg-amethyst`}>
        {busy ? "Connecting" : compact ? "Connect" : "Connect wallet"}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-14 z-50 w-64 rounded-capsule border border-ink bg-paper p-2 shadow-print-sm">
          {wallets.length === 0 && (
            <p className="p-3 text-sm text-graphite">
              No Solana wallet found. <a className="text-amethyst-deep underline" href="https://phantom.com/download" target="_blank" rel="noreferrer">Get Phantom</a>, then reload.
            </p>
          )}
          {wallets.map((w) => (
            <button key={w.name} type="button" role="menuitem" onClick={async () => { await connect(w); setOpen(false); }} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-vellum">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={w.icon} alt="" width={20} height={20} className="rounded" />
              {w.name}
            </button>
          ))}
          {error && <p className="p-3 text-sm text-ember-ink" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const isApp = ["/studio", "/tab", "/rescue"].some((p) => path.startsWith(p));
  return (
    <header className="sticky top-3 z-40 mx-auto w-[calc(100%-32px)] max-w-6xl">
      <nav aria-label="Main" className="flex h-16 items-center justify-between rounded-capsule border border-ink/20 bg-vellum/80 px-3 shadow-[0_0_24px_rgba(181,124,255,0.35)] backdrop-blur-md sm:px-4">
        <Link href="/" className="flex h-11 items-center gap-2 text-ink" aria-label="Meruit home">
          <Mark /> <Wordmark />
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link href={l.href} aria-current={active ? "page" : undefined} className={`${btn} ${active ? "bg-amethyst-deep text-white" : "text-ink hover:bg-paper"}`}>{l.label}</Link>
              </li>
            );
          })}
          {isApp && <li><Link href={`${path}?tour=1`} className={`${btn} border border-ink/30 text-ink hover:bg-paper`}>Guided tour</Link></li>}
        </ul>
        <div className="flex items-center gap-2">
          <ConnectControl compact />
          <button type="button" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)} className={`${btn} w-11 border border-ink bg-paper px-0 md:hidden`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </nav>
      {menu && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 bg-paper p-4 md:hidden">
          <div className="flex h-16 items-center justify-between">
            <span className="flex items-center gap-2"><Mark /> <Wordmark /></span>
            <button type="button" aria-label="Close menu" onClick={() => setMenu(false)} className={`${btn} w-11 border border-ink px-0`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <ul className="mt-6 space-y-2">
            {[{ href: "/", label: "Home" }, ...LINKS, { href: "/rescue", label: "Get my money back" }, { href: "/status", label: "Status" }].map((l) => (
              <li key={l.href}><Link href={l.href} onClick={() => setMenu(false)} className="flex h-14 items-center rounded-capsule border border-ink/20 bg-vellum px-4 font-display text-xl">{l.label}</Link></li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
