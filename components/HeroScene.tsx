"use client";
import { motion, useReducedMotion } from "framer-motion";
import { GlowCard } from "./GlowCard";

// Hero illustration: three receipt cards (ceiling, film strip with captions, meter) and chain tokens entering
// along a dashed path. Hand-written SVG, no raster. Perspective is applied on the wrapper, never inside the SVG.
export function HeroScene() {
  const reduce = useReducedMotion();
  const dur = reduce ? 0 : 2.4;
  const segs = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div className="relative mx-auto w-full max-w-[560px]" aria-label="A ceiling bar fills, captions appear, and the unused part returns as change">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[70%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ultraviolet opacity-35 blur-[80px]" />
      <motion.div
        whileHover={reduce ? undefined : { y: -6 }}
        className="relative"
        style={{ transform: "perspective(1200px) rotateY(-14deg) rotateX(6deg)", transformStyle: "preserve-3d" }}
      >
        <svg viewBox="0 0 720 560" className="h-auto w-full" role="img" aria-labelledby="hero-title">
          <title id="hero-title">Receipt cards: a ceiling of twelve cents, a film strip of captions, and a meter showing nine of twelve minutes charged and three returned</title>
          <defs>
            <pattern id="perf" width="16" height="10" patternUnits="userSpaceOnUse"><circle cx="8" cy="4" r="3" fill="#FBF9FF" stroke="#171128" strokeWidth="1" /></pattern>
            <pattern id="sprocket" width="22" height="14" patternUnits="userSpaceOnUse"><rect x="5" y="3" width="10" height="8" rx="2" fill="#FBF9FF" stroke="#171128" strokeWidth="1" /></pattern>
          </defs>

          {/* chain tokens along a dashed path */}
          <path d="M0 300 C 80 300, 120 330, 190 330" fill="none" stroke="#7B3FE4" strokeWidth="1.5" strokeDasharray="6 8" />
          {[{ y: 300, d: 0 }, { y: 318, d: 0.5 }, { y: 282, d: 1 }].map((t, i) => (
            <motion.g key={i} initial={{ x: reduce ? 60 : -10, opacity: reduce ? 1 : 0 }} animate={{ x: 60, opacity: 1 }} transition={{ duration: dur / 2, delay: t.d * 0.3 }}>
              <rect x="14" y={t.y - 14} width="28" height="28" rx={i === 1 ? 14 : 7} fill="#F3EEFF" stroke="#171128" strokeWidth="1.5" transform={i === 2 ? `rotate(45 28 ${t.y})` : undefined} />
              <path d={`M22 ${t.y}h12`} stroke="#7B3FE4" strokeWidth="2" strokeLinecap="round" />
            </motion.g>
          ))}

          {/* back card: ceiling */}
          <g transform="translate(250 40) rotate(-5)">
            <rect x="0" y="12" width="400" height="190" rx="14" fill="#F3EEFF" stroke="#171128" strokeWidth="1.5" />
            <rect x="0" y="0" width="400" height="14" fill="url(#perf)" />
            <text x="24" y="62" fontFamily="var(--font-martian)" fontSize="13" fill="#5B5470" letterSpacing="2">CEILING</text>
            <text x="24" y="128" fontFamily="var(--font-zodiak)" fontSize="64" fontWeight="600" fill="#171128">$0.12</text>
            <text x="24" y="170" fontFamily="var(--font-martian)" fontSize="12" fill="#5B5470">12 min x $0.01</text>
          </g>

          {/* middle card: film strip */}
          <g transform="translate(150 190) rotate(2)">
            <rect x="0" y="0" width="440" height="170" rx="14" fill="#F3EEFF" stroke="#171128" strokeWidth="1.5" />
            <rect x="12" y="10" width="416" height="14" fill="url(#sprocket)" />
            <rect x="12" y="146" width="416" height="14" fill="url(#sprocket)" />
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <rect x={18 + i * 104} y="34" width="96" height="104" rx="6" fill="#FBF9FF" stroke="#171128" strokeWidth="1.2" />
                <motion.g initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.5 + i * 0.35 }}>
                  <rect x={26 + i * 104} y="96" width="80" height="6" rx="3" fill="#7B3FE4" opacity="0.85" />
                  <rect x={26 + i * 104} y="108" width={60 - i * 6} height="6" rx="3" fill="#171128" opacity="0.7" />
                </motion.g>
                <circle cx={66 + i * 104} cy="68" r="14" fill="none" stroke="#B57CFF" strokeWidth="1.5" />
              </g>
            ))}
          </g>

          {/* front card: the meter */}
          <g transform="translate(110 360) rotate(-1.5)">
            <rect x="0" y="0" width="520" height="170" rx="14" fill="#F3EEFF" stroke="#171128" strokeWidth="1.5" />
            <text x="24" y="38" fontFamily="var(--font-martian)" fontSize="12" fill="#5B5470" letterSpacing="2">DELIVERED 09:00 OF 12:00</text>
            {segs.map((i) => {
              const filled = i < 9;
              const x = 24 + i * 34;
              return filled ? (
                <motion.rect key={i} x={x} y="58" width="28" height="44" rx="6" fill="#7B3FE4" stroke="#171128" strokeWidth="1.2" initial={{ scaleY: reduce ? 1 : 0 }} animate={{ scaleY: 1 }} style={{ transformOrigin: `${x + 14}px 102px` }} transition={{ delay: reduce ? 0 : i * 0.1, duration: 0.25 }} />
              ) : (
                <motion.rect key={i} x={x} y="58" width="28" height="44" rx="6" fill="none" stroke="#171128" strokeWidth="1.2" strokeDasharray="4 3" initial={{ x: 0, opacity: 1 }} animate={{ x: reduce ? 0 : [0, 0, 70], opacity: reduce ? 1 : [1, 1, 0] }} transition={{ duration: dur, times: [0, 0.6, 1] }} />
              );
            })}
            <motion.g initial={{ opacity: reduce ? 1 : 0, x: reduce ? 0 : -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduce ? 0 : dur * 0.7, duration: 0.5 }}>
              <rect x="318" y="116" width="178" height="38" rx="19" fill="#14F195" stroke="#171128" strokeWidth="1.5" />
              <text x="407" y="140" textAnchor="middle" fontFamily="var(--font-martian)" fontSize="13" fontWeight="600" fill="#171128">returned $0.03</text>
            </motion.g>
            <text x="24" y="144" fontFamily="var(--font-martian)" fontSize="12" fill="#5B5470">charged $0.09</text>
          </g>
        </svg>
      </motion.div>
    </div>
  );
}

export { GlowCard };
