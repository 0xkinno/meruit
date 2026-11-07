import type { Config } from "tailwindcss";

// Colour roles from DESIGN.md. Text on Paper or Vellum uses `amethyst`, `graphite`, `ink` or `ember-ink`.
// `mint` and `ember` are fills and strokes; text that sits on them is Ink.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FBF9FF",
        vellum: "#F3EEFF",
        ink: "#171128",
        amethyst: "#7B3FE4",
        "amethyst-deep": "#5F27C4",
        ultraviolet: "#B57CFF",
        mint: "#14F195",
        "mint-ink": "#0B6B47",
        ember: "#FF6B4A",
        "ember-ink": "#B3361A",
        graphite: "#5B5470",
      },
      fontFamily: {
        display: ["var(--font-zodiak)", "Georgia", "serif"],
        sans: ["var(--font-switzer)", "ui-sans-serif", "sans-serif"],
        mono: ["var(--font-martian)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        print: "8px 10px 0 rgba(23,17,40,0.9)",
        "print-sm": "4px 5px 0 rgba(23,17,40,0.9)",
        halo: "0 0 0 3px rgba(181,124,255,0.55)",
      },
      borderRadius: { card: "14px", capsule: "16px" },
    },
  },
  plugins: [],
};
export default config;
