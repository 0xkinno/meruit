import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const zodiak = localFont({
  src: [
    { path: "../public/fonts/Zodiak-Variable.woff2", style: "normal" },
    { path: "../public/fonts/Zodiak-VariableItalic.woff2", style: "italic" },
  ],
  variable: "--font-zodiak",
  display: "swap",
});
const switzer = localFont({
  src: [{ path: "../public/fonts/Switzer-Variable.woff2", style: "normal" }],
  variable: "--font-switzer",
  display: "swap",
});
const martian = localFont({
  src: [
    { path: "../public/fonts/MartianMono-400.woff2", weight: "400" },
    { path: "../public/fonts/MartianMono-500.woff2", weight: "500" },
    { path: "../public/fonts/MartianMono-600.woff2", weight: "600" },
  ],
  variable: "--font-martian",
  display: "swap",
});

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://meruit.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "MERUIT. Pay for the minutes you got.", template: "%s | MERUIT" },
  description:
    "Subtitles charged on Solana only for the minutes delivered, topped up from any chain. Unused money comes back.",
  openGraph: { title: "MERUIT", description: "Pay for the minutes you got.", images: ["/og.svg"], type: "website" },
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = { themeColor: "#FBF9FF", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${zodiak.variable} ${switzer.variable} ${martian.variable}`}>
      <body className="grain">{children}</body>
    </html>
  );
}
