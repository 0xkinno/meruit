// Four section icons in one 1.5 px stroke style: meter, chain-in, escape door, receipt.
const base = { width: 40, height: 40, viewBox: "0 0 40 40", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const MeterIcon = () => (
  <svg {...base}><rect x="4" y="14" width="32" height="12" rx="3" /><path d="M9 18v4M14 18v4M19 18v4M24 18v4" /><path d="M28 18v4" strokeDasharray="1 3" /></svg>
);
export const ChainInIcon = () => (
  <svg {...base}><circle cx="9" cy="12" r="4" /><circle cx="9" cy="28" r="4" /><path d="M14 13l10 6M14 27l10-6" /><rect x="26" y="14" width="10" height="12" rx="3" /></svg>
);
export const DoorIcon = () => (
  <svg {...base}><path d="M10 34V8h14v26" /><path d="M6 34h28" /><circle cx="20" cy="22" r="1.2" fill="currentColor" /><path d="M28 16l6 4-6 4" /></svg>
);
export const ReceiptIcon = () => (
  <svg {...base}><path d="M10 5h20v30l-4-3-3 3-3-3-3 3-3-3-4 3z" /><path d="M15 13h10M15 19h10M15 25h6" /></svg>
);
