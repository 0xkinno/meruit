import { describe, it, expect } from "vitest";
import { encodeWav, chunkPlan } from "@/lib/transcribe/chunk";

describe("chunker", () => {
  it("plans 60 s chunks with a short tail", () => {
    const plan = chunkPlan(16000 * 150);
    expect(plan.map((p) => p.seconds)).toEqual([60, 60, 30]);
    expect(plan[1].start).toBe(16000 * 60);
    expect(plan.at(-1)!.end).toBe(16000 * 150);
  });
  it("12 minutes is exactly 12 chunks", () => { expect(chunkPlan(16000 * 720).length).toBe(12); });
  it("writes a valid 16 kHz mono 16-bit WAV header", () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1, -1]), 16000);
    const v = new DataView(wav.buffer);
    const tag = (o: number) => String.fromCharCode(...wav.slice(o, o + 4));
    expect([tag(0), tag(8), tag(12), tag(36)]).toEqual(["RIFF", "WAVE", "fmt ", "data"]);
    expect(v.getUint32(24, true)).toBe(16000);
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint16(34, true)).toBe(16);
    expect(v.getUint32(40, true)).toBe(10);
    expect(wav.length).toBe(54);
    expect(v.getInt16(44 + 6, true)).toBe(0x7fff);
    expect(v.getInt16(44 + 8, true)).toBe(-0x8000);
  });
});
