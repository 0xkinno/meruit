// MERUIT_SABOTAGE: a comma list of deliberate failures used by the break campaign (B1 to B5).
// Empty in production. On preview deployments a signed header may set it per request.
import { createHmac, timingSafeEqual } from "node:crypto";

export type Sabotage = { drop: number; vanish: boolean; doubleSettle: boolean; staleSlot: boolean; overcharge: boolean };

export function parseSabotage(raw: string | undefined | null): Sabotage {
  const out: Sabotage = { drop: 0, vanish: false, doubleSettle: false, staleSlot: false, overcharge: false };
  for (const part of (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    if (part.startsWith("drop:")) {
      const n = Number(part.slice(5));
      if (Number.isInteger(n) && n > 0) out.drop = n;
    } else if (part === "vanish") out.vanish = true;
    else if (part === "double_settle") out.doubleSettle = true;
    else if (part === "stale_slot") out.staleSlot = true;
    else if (part === "overcharge") out.overcharge = true;
  }
  return out;
}

export function signSabotage(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

/**
 * Resolve the active switch for a request. The env value always applies. A per-request header
 * `x-meruit-sabotage: <value>.<hmac>` applies only outside production and only with a valid signature.
 */
export function activeSabotage(headers?: Headers, env = process.env): Sabotage {
  const base = parseSabotage(env.MERUIT_SABOTAGE);
  const header = headers?.get("x-meruit-sabotage");
  if (!header || env.VERCEL_ENV === "production" || !env.MERUIT_SIGNING_SECRET) return base;
  const i = header.lastIndexOf(".");
  if (i < 1) return base;
  const value = header.slice(0, i);
  const mac = header.slice(i + 1);
  const want = signSabotage(value, env.MERUIT_SIGNING_SECRET);
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(want, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return base;
  return parseSabotage(value);
}

/** Indexes of chunks to fail upstream, spread evenly: drop:3 of 12 -> 3, 6, 9. */
export function dropIndexes(total: number, drop: number): Set<number> {
  const out = new Set<number>();
  if (drop <= 0 || total <= 0) return out;
  const n = Math.min(drop, total);
  for (let k = 0; k < n; k++) out.add(Math.min(total - 1, Math.floor(((k + 1) * total) / (n + 1))));
  // ensure exactly n distinct indexes
  for (let i = total - 1; out.size < n && i >= 0; i--) out.add(i);
  return out;
}

export function sabotageLabel(s: Sabotage): string {
  const parts: string[] = [];
  if (s.drop) parts.push(`drop:${s.drop}`);
  if (s.vanish) parts.push("vanish");
  if (s.doubleSettle) parts.push("double_settle");
  if (s.staleSlot) parts.push("stale_slot");
  if (s.overcharge) parts.push("overcharge");
  return parts.length ? parts.join(",") : "off";
}
