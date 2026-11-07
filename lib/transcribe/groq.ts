// Server: Groq Whisper per chunk. Groq is the demo seller's upstream model, not a sponsor product.
import type { Segment } from "../srt";

export type ChunkInput = { url: string; seconds: number };
export type ChunkResult = { index: number; ok: boolean; seconds: number; segments: Segment[]; error?: string; ms: number };

const MODEL = "whisper-large-v3-turbo";

/** Only fetch audio from our own Blob store. */
export function isAllowedAudioUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && (url.hostname.endsWith(".public.blob.vercel-storage.com") || url.hostname.endsWith(".blob.vercel-storage.com"));
  } catch { return false; }
}

export function deliveredRule(segments: Segment[]): boolean {
  // Delivered: non-empty text, or a confident no-speech result (silence is a valid delivery).
  if (segments.some((s) => s.text.trim().length > 0)) return true;
  return segments.length === 0 ? true : segments.every((s) => (s.noSpeechProb ?? 0) > 0.5);
}

export async function transcribeChunk(input: ChunkInput, index: number, opts: { fail?: boolean; fetchImpl?: typeof fetch; allowAnyUrl?: boolean } = {}): Promise<ChunkResult> {
  const t0 = Date.now();
  const f = opts.fetchImpl ?? fetch;
  const done = (r: Partial<ChunkResult>): ChunkResult => ({ index, ok: false, seconds: input.seconds, segments: [], ms: Date.now() - t0, ...r });
  if (opts.fail) return done({ error: "injected_failure" });
  if (!opts.allowAnyUrl && !isAllowedAudioUrl(input.url)) return done({ error: "audio_url_not_allowed" });
  if (!process.env.GROQ_API_KEY) return done({ error: "groq_not_configured" });
  try {
    const audio = await f(input.url);
    if (!audio.ok) return done({ error: `audio_fetch_${audio.status}` });
    const form = new FormData();
    form.append("file", new File([await audio.arrayBuffer()], `chunk-${index}.wav`, { type: "audio/wav" }));
    form.append("model", MODEL);
    form.append("response_format", "verbose_json");
    form.append("temperature", "0");
    const r = await f("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: form });
    if (!r.ok) return done({ error: `groq_${r.status}` });
    const j = (await r.json()) as { segments?: { start: number; end: number; text: string; avg_logprob?: number; no_speech_prob?: number }[]; text?: string };
    const segments: Segment[] = (j.segments ?? []).map((s) => ({ start: s.start, end: s.end, text: s.text, avgLogprob: s.avg_logprob, noSpeechProb: s.no_speech_prob }));
    if (!deliveredRule(segments)) return done({ segments, error: "empty_result" });
    return done({ ok: true, segments });
  } catch (e) {
    return done({ error: (e as Error).message.slice(0, 120) });
  }
}

export async function transcribeChunks(chunks: ChunkInput[], opts: { failIndexes?: Set<number>; concurrency?: number; fetchImpl?: typeof fetch; allowAnyUrl?: boolean } = {}): Promise<ChunkResult[]> {
  const results: ChunkResult[] = new Array(chunks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(opts.concurrency ?? 4, chunks.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= chunks.length) return;
      results[i] = await transcribeChunk(chunks[i], i, { fail: opts.failIndexes?.has(i), fetchImpl: opts.fetchImpl, allowAnyUrl: opts.allowAnyUrl });
    }
  });
  await Promise.all(workers);
  return results;
}
