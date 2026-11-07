import { describe, it, expect } from "vitest";
import { Jobs } from "@/lib/jobs";
import { __memoryKV } from "@/lib/store";

const mk = () => { const kv = __memoryKV(); return new Jobs(() => kv); };
const init = { declaredSeconds: 720, cap: "120000", network: "devnet" };

describe("job state machine", () => {
  it("a retried create with the same id never creates a second job", async () => {
    const j = mk();
    const a = await j.create("job_12345678", init);
    const b = await j.create("job_12345678", { ...init, cap: "999" });
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.job.cap).toBe("120000");
    expect((await j.list()).length).toBe(1);
  });
  it("walks the happy path and records signatures", async () => {
    const j = mk();
    await j.create("job_12345678", init);
    for (const s of ["quoted", "approved"] as const) await j.transition("job_12345678", s);
    await j.transition("job_12345678", "opened", { signature: "SIGopen", sigName: "open", actor: "seller" });
    for (const s of ["delivering", "delivered", "settling"] as const) await j.transition("job_12345678", s);
    const done = await j.transition("job_12345678", "settled", { signature: "SIGsettle", sigName: "settle", charge: "90000" });
    expect(done.signatures).toEqual({ open: "SIGopen", settle: "SIGsettle" });
    expect((await j.transition("job_12345678", "closed")).events.map((e) => e.state).at(-1)).toBe("closed");
  });
  it("is idempotent for the same target state and refuses illegal jumps", async () => {
    const j = mk();
    await j.create("job_12345678", init);
    await j.transition("job_12345678", "quoted");
    await j.transition("job_12345678", "quoted");
    await expect(j.transition("job_12345678", "settled")).rejects.toThrow("illegal_transition_quoted_to_settled");
    await expect(j.transition("nope_nope_nope", "quoted")).rejects.toThrow("job_not_found");
  });
  it("seller silent branches to buyer exit", async () => {
    const j = mk();
    await j.create("job_12345678", init);
    for (const s of ["quoted", "approved", "opened", "seller_silent", "buyer_closing", "sealed", "refunded"] as const) await j.transition("job_12345678", s);
    expect((await j.get("job_12345678"))!.state).toBe("refunded");
  });
  it("rejects bad ids", async () => { await expect(mk().create("x", init)).rejects.toThrow("invalid_job_id"); });
});
