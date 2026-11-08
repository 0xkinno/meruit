// Cues, .srt and .vtt builders. Chunk k is offset by k * chunkSeconds.
export type Segment = { start: number; end: number; text: string; avgLogprob?: number; noSpeechProb?: number };
export type Cue = { id: number; start: number; end: number; text: string; check: boolean; edited?: boolean };

/** Documented threshold (DESIGN and README): a cue is marked "check" when the model was unsure. */
export const CHECK_LOGPROB = -0.8;
export const CHECK_NO_SPEECH = 0.5;

export function needsCheck(s: Pick<Segment, "avgLogprob" | "noSpeechProb">): boolean {
  return (s.avgLogprob !== undefined && s.avgLogprob < CHECK_LOGPROB) || (s.noSpeechProb !== undefined && s.noSpeechProb > CHECK_NO_SPEECH);
}

/** House style: model output shown in the UI carries no en or em dashes. */
export const plainDashes = (t: string) => t.replace(/[\u2013\u2014]/g, "-");

export function cuesFromChunks(chunks: { index: number; ok: boolean; segments: Segment[] }[], chunkSeconds = 60): Cue[] {
  const out: Cue[] = [];
  for (const c of [...chunks].sort((a, b) => a.index - b.index)) {
    if (!c.ok) continue;
    for (const s of c.segments) {
      const text = plainDashes(s.text.trim());
      if (!text) continue;
      const off = c.index * chunkSeconds;
      out.push({ id: out.length + 1, start: off + s.start, end: off + Math.max(s.end, s.start + 0.2), text, check: needsCheck(s) });
    }
  }
  return out;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
function stamp(t: number, sep: "," | "."): string {
  const ms = Math.max(0, Math.round(t * 1000));
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor((ms % 3_600_000) / 60_000))}:${pad(Math.floor((ms % 60_000) / 1000))}${sep}${pad(ms % 1000, 3)}`;
}

export const toSrt = (cues: Cue[]) =>
  cues.map((c, i) => `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${c.text}\n`).join("\n");

export const toVtt = (cues: Cue[]) =>
  "WEBVTT\n\n" + cues.map((c, i) => `${i + 1}\n${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${c.text}\n`).join("\n");
