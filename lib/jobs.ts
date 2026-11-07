// Job state machine (docs: MERUIT_BUILD_INSTRUCTION 8.3). Job id is the idempotency key.
import { getKV, type KV } from "./store";

export type JobState =
  | "draft" | "quoted" | "approved" | "opened" | "delivering" | "delivered" | "settling" | "settled" | "closed"
  | "rejected_by_wallet" | "verify_failed" | "upstream_failed" | "seller_silent" | "buyer_closing" | "sealed" | "refunded" | "swept";

const NEXT: Record<JobState, JobState[]> = {
  draft: ["quoted", "rejected_by_wallet"],
  quoted: ["approved", "rejected_by_wallet", "verify_failed", "swept"],
  approved: ["opened", "verify_failed", "seller_silent"],
  opened: ["delivering", "seller_silent", "swept"],
  delivering: ["delivered", "upstream_failed", "seller_silent"],
  delivered: ["settling"],
  settling: ["settled", "seller_silent"],
  settled: ["closed"],
  closed: [],
  rejected_by_wallet: [], verify_failed: [],
  upstream_failed: ["settling"],
  seller_silent: ["buyer_closing", "swept"],
  buyer_closing: ["sealed"],
  sealed: ["refunded"],
  refunded: [], swept: [],
};

export type JobEvent = { state: JobState; at: number; actor: "buyer" | "seller" | "sweeper" | "system"; signature?: string; note?: string };
export type Job = {
  id: string; state: JobState; createdAt: number; updatedAt: number;
  declaredSeconds: number; cap: string; network: string; payer?: string; channelId?: string;
  deliveredSeconds?: number; charge?: string; refund?: string; failedChunks?: number[]; sabotage?: string;
  signatures: Record<string, string>; events: JobEvent[];
  result?: unknown;
};

const key = (id: string) => `meruit:job:${id}`;
export const isValidJobId = (id: string) => /^[a-zA-Z0-9_-]{8,64}$/.test(id);

export class Jobs {
  constructor(private kv: () => KV = getKV) {}

  /** Creates the job once. A retried call with the same id returns the existing job and never creates a second. */
  async create(id: string, init: Pick<Job, "declaredSeconds" | "cap" | "network"> & Partial<Job>): Promise<{ job: Job; created: boolean }> {
    if (!isValidJobId(id)) throw new Error("invalid_job_id");
    const now = Date.now();
    const job: Job = { id, state: "draft", createdAt: now, updatedAt: now, signatures: {}, events: [{ state: "draft", at: now, actor: "system" }], ...init };
    const created = await this.kv().set(key(id), job, { nx: true });
    if (created) { await this.kv().sadd("meruit:jobs", id); return { job, created: true }; }
    return { job: (await this.get(id))!, created: false };
  }
  get(id: string) { return this.kv().get<Job>(key(id)); }

  async transition(id: string, to: JobState, patch: Partial<Job> & { actor?: JobEvent["actor"]; signature?: string; note?: string; sigName?: string } = {}): Promise<Job> {
    const job = await this.get(id);
    if (!job) throw new Error("job_not_found");
    if (job.state === to) return job; // idempotent
    if (!NEXT[job.state].includes(to)) throw new Error(`illegal_transition_${job.state}_to_${to}`);
    const { actor = "system", signature, note, sigName, ...rest } = patch;
    const now = Date.now();
    const next: Job = {
      ...job, ...rest, state: to, updatedAt: now,
      signatures: signature ? { ...job.signatures, [sigName ?? to]: signature } : job.signatures,
      events: [...job.events, { state: to, at: now, actor, signature, note }],
    };
    await this.kv().set(key(id), next);
    return next;
  }
  async list(limit = 100): Promise<Job[]> {
    const ids = (await this.kv().smembers("meruit:jobs")).slice(-limit);
    const out = await Promise.all(ids.map((i) => this.get(i)));
    return out.filter((j): j is Job => !!j).sort((a, b) => b.createdAt - a.createdAt);
  }
  allowed(from: JobState) { return NEXT[from]; }
}
export const jobs = new Jobs();
