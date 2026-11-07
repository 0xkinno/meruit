// The mark: a caption bracket whose right side is a coin notch. One path, legible at 16 px.
export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <path d="M12 6H7v20h5M20 6h5v20h-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="3.2" fill="#14F195" stroke="#171128" strokeWidth="1.2" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-display small-caps text-[22px] font-semibold leading-none ${className}`} style={{ letterSpacing: "0.08em" }}>Meruit</span>;
}
