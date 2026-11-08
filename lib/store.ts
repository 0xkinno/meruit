// Durable state on Upstash Redis. In tests (NODE_ENV=test) an in-memory map stands in, and
// /api/status reports which backend is live. There is no silent fallback outside tests.
import { Redis } from "@upstash/redis";

export interface KV {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { nx?: boolean; ex?: number }): Promise<boolean>;
  del(key: string): Promise<void>;
  incrBy(key: string, n: number, ttlSecs?: number): Promise<number>;
  sadd(key: string, member: string): Promise<void>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, member: string): Promise<void>;
  lpush(key: string, value: unknown, cap?: number): Promise<void>;
  lrange<T = unknown>(key: string, start: number, stop: number): Promise<T[]>;
  hsetnx(key: string, field: string, value: unknown): Promise<boolean>;
  hgetall<T = unknown>(key: string): Promise<Record<string, T>>;
  hset(key: string, field: string, value: unknown): Promise<void>;
  hdel(key: string, field: string): Promise<void>;
  ping(): Promise<boolean>;
}

class MemoryKV implements KV {
  m = new Map<string, unknown>();
  async get<T>(k: string) { return (this.m.has(k) ? (structuredClone(this.m.get(k)) as T) : null); }
  async set(k: string, v: unknown, o?: { nx?: boolean }) { if (o?.nx && this.m.has(k)) return false; this.m.set(k, structuredClone(v)); return true; }
  async del(k: string) { this.m.delete(k); }
  async incrBy(k: string, n: number) { const v = ((this.m.get(k) as number) ?? 0) + n; this.m.set(k, v); return v; }
  async sadd(k: string, x: string) { const s = (this.m.get(k) as Set<string>) ?? new Set(); s.add(x); this.m.set(k, s); }
  async smembers(k: string) { return [...(((this.m.get(k) as Set<string>) ?? new Set()))]; }
  async srem(k: string, x: string) { ((this.m.get(k) as Set<string>) ?? new Set()).delete(x); }
  async lpush(k: string, v: unknown, cap = 1000) { const l = ((this.m.get(k) as unknown[]) ?? []); l.unshift(structuredClone(v)); this.m.set(k, l.slice(0, cap)); }
  async lrange<T>(k: string, a: number, b: number) { return (((this.m.get(k) as T[]) ?? []).slice(a, b + 1)); }
  async hsetnx(k: string, f: string, v: unknown) { const h = (this.m.get(k) as Map<string, unknown>) ?? new Map(); if (h.has(f)) return false; h.set(f, structuredClone(v)); this.m.set(k, h); return true; }
  async hgetall<T>(k: string) { return Object.fromEntries(((this.m.get(k) as Map<string, T>) ?? new Map()).entries()); }
  async hset(k: string, f: string, v: unknown) { const h = (this.m.get(k) as Map<string, unknown>) ?? new Map(); h.set(f, structuredClone(v)); this.m.set(k, h); }
  async hdel(k: string, f: string) { ((this.m.get(k) as Map<string, unknown>) ?? new Map()).delete(f); }
  async ping() { return true; }
}

class UpstashKV implements KV {
  constructor(private r: Redis) {}
  async get<T>(k: string) { return (await this.r.get<T>(k)) ?? null; }
  async set(k: string, v: unknown, o?: { nx?: boolean; ex?: number }) {
    const res = await this.r.set(k, v as never, { ...(o?.nx ? { nx: true as const } : {}), ...(o?.ex ? { ex: o.ex } : {}) } as never);
    return res === "OK";
  }
  async del(k: string) { await this.r.del(k); }
  async incrBy(k: string, n: number, ttl?: number) { const v = await this.r.incrby(k, n); if (ttl && v === n) await this.r.expire(k, ttl); return v; }
  async sadd(k: string, m: string) { await this.r.sadd(k, m); }
  async smembers(k: string) { return (await this.r.smembers(k)) as string[]; }
  async srem(k: string, m: string) { await this.r.srem(k, m); }
  async lpush(k: string, v: unknown, cap = 1000) { await this.r.lpush(k, v as never); await this.r.ltrim(k, 0, cap - 1); }
  async lrange<T>(k: string, a: number, b: number) { return (await this.r.lrange(k, a, b)) as T[]; }
  async hsetnx(k: string, f: string, v: unknown) { return (await this.r.hsetnx(k, f, v as never)) === 1; }
  async hgetall<T>(k: string) { return ((await this.r.hgetall(k)) ?? {}) as Record<string, T>; }
  async hset(k: string, f: string, v: unknown) { await this.r.hset(k, { [f]: v as never }); }
  async hdel(k: string, f: string) { await this.r.hdel(k, f); }
  async ping() { return (await this.r.ping()) === "PONG"; }
}

// The local in-memory store lives on globalThis so route handlers and server components share one instance in `next dev`
// (Redis is shared by construction in production).
const g = globalThis as unknown as { __meruitMemoryKV?: KV };
let kv: KV | null = null;
const redisUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function backendName(): "upstash" | "memory" | "unconfigured" {
  if (redisUrl() && redisToken()) return "upstash";
  // Explicit opt-in for local development and tests only. /api/status reports it. Never set in production.
  return process.env.NODE_ENV === "test" || process.env.MERUIT_STORE === "memory" ? "memory" : "unconfigured";
}
export function getKV(): KV {
  if (kv) return kv;
  const b = backendName();
  if (b === "upstash") kv = new UpstashKV(new Redis({ url: redisUrl()!, token: redisToken()! }));
  else if (b === "memory") kv = g.__meruitMemoryKV ??= new MemoryKV();
  else throw new Error("store_unconfigured: connect Upstash Redis (KV_REST_API_URL and KV_REST_API_TOKEN)");
  return kv;
}
export function __setKVForTests(k: KV | null) { kv = k; }
export function __memoryKV(): KV { return new MemoryKV(); }
