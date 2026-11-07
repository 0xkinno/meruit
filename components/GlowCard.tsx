"use client";
import { motion, useMotionValue, useMotionTemplate, useReducedMotion } from "framer-motion";

export function GlowCard({ children, className = "", as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" | "article" }) {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const reduce = useReducedMotion();
  const bg = useMotionTemplate`radial-gradient(240px circle at ${x}px ${y}px, rgba(181,124,255,0.28), transparent 70%)`;
  const Tag = motion[as];
  return (
    <Tag
      onPointerMove={(e: React.PointerEvent<HTMLElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onPointerLeave={() => { x.set(-200); y.set(-200); }}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`relative overflow-hidden rounded-card border border-ink bg-vellum shadow-print ${className}`}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: bg }} />
      <div className="relative">{children}</div>
    </Tag>
  );
}

export function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}
