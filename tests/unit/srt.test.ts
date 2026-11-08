import { describe, it, expect } from "vitest";
import { cuesFromChunks, toSrt, toVtt, needsCheck, plainDashes } from "@/lib/srt";
import { deliveredRule, isAllowedAudioUrl, transcribeChunks } from "@/lib/transcribe/groq";

describe("srt and vtt", () => {
  const chunks = [
    { index: 0, ok: true, segments: [{ start: 0, end: 2.5, text: " Hello there.", avgLogprob: -0.2, noSpeechProb: 0.01 }] },
    { index: 1, ok: false, segments: [{ start: 0, end: 3, text: "never shown" }] },
    { index: 2, ok: true, segments: [{ start: 1.25, end: 4, text: "Second chunk line", avgLogprob: -1.1 }] },
  ];
  it("offsets cues by chunk index and skips failed chunks", () => {
    const cues = cuesFromChunks(chunks);
    expect(cues.map((c) => [c.start, c.end, c.text])).toEqual([[0, 2.5, "Hello there."], [121.25, 124, "Second chunk line"]]);
    expect(cues.map((c) => c.check)).toEqual([false, true]);
  });
  it("formats srt with commas and vtt with dots", () => {
    const cues = cuesFromChunks(chunks);
    expect(toSrt(cues)).toBe("1\n00:00:00,000 --> 00:00:02,500\nHello there.\n\n2\n00:02:01,250 --> 00:02:04,000\nSecond chunk line\n");
    expect(toVtt(cues).startsWith("WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.500")).toBe(true);
  });
  it("check threshold", () => {
    expect(needsCheck({ avgLogprob: -0.81 })).toBe(true);
    expect(needsCheck({ avgLogprob: -0.8 })).toBe(false);
    expect(needsCheck({ noSpeechProb: 0.51 })).toBe(true);
    expect(needsCheck({})).toBe(false);
  });
});

describe("caption text", () => {
  it("replaces en and em dashes so no dash reaches the UI", () => {
    expect(plainDashes("leaf\u2014 and \u2013 more")).toBe("leaf- and - more");
    const cues = cuesFromChunks([{ index: 0, ok: true, segments: [{ start: 0, end: 1, text: "rhubarb leaf\u2014" }] }]);
    expect(cues[0].text).toBe("rhubarb leaf-");
  });
});

describe("groq delivery rules", () => {
  it("delivered means text or confident silence", () => {
    expect(deliveredRule([{ start: 0, end: 1, text: "hi" }])).toBe(true);
    expect(deliveredRule([])).toBe(true);
    expect(deliveredRule([{ start: 0, end: 1, text: " ", noSpeechProb: 0.9 }])).toBe(true);
    expect(deliveredRule([{ start: 0, end: 1, text: " ", noSpeechProb: 0.1 }])).toBe(false);
  });
  it("only fetches from the Blob store", () => {
    expect(isAllowedAudioUrl("https://abc.public.blob.vercel-storage.com/x.wav")).toBe(true);
    expect(isAllowedAudioUrl("http://abc.public.blob.vercel-storage.com/x.wav")).toBe(false);
    expect(isAllowedAudioUrl("https://evil.example/x.wav")).toBe(false);
    expect(isAllowedAudioUrl("nonsense")).toBe(false);
  });
  it("injected failures are not delivered, others are", async () => {
    process.env.GROQ_API_KEY = "test";
    const fake: typeof fetch = async (input) => {
      const u = String(input);
      if (u.includes("groq.com")) return new Response(JSON.stringify({ segments: [{ start: 0, end: 1, text: "ok", avg_logprob: -0.1, no_speech_prob: 0 }] }));
      return new Response(new Uint8Array(10));
    };
    const r = await transcribeChunks(Array.from({ length: 12 }, () => ({ url: "https://x.example/a.wav", seconds: 60 })), { failIndexes: new Set([3, 6, 9]), fetchImpl: fake, allowAnyUrl: true });
    expect(r.filter((x) => x.ok).length).toBe(9);
    expect(r.filter((x) => !x.ok).map((x) => x.index)).toEqual([3, 6, 9]);
    expect(r.filter((x) => x.ok).reduce((s, x) => s + x.seconds, 0)).toBe(540);
  });
});
