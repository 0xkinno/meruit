// Browser: decode, resample to 16 kHz mono, split into 60 s WAV chunks. The pure parts are unit tested.
export const TARGET_RATE = 16000;
export const CHUNK_SECONDS = 60;

/** 16-bit PCM mono WAV. */
export function encodeWav(samples: Float32Array, sampleRate = TARGET_RATE): Uint8Array {
  const dataBytes = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataBytes);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + dataBytes, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buf);
}

/** Chunk boundaries in samples. The last chunk may be shorter. */
export function chunkPlan(totalSamples: number, rate = TARGET_RATE, seconds = CHUNK_SECONDS): { start: number; end: number; seconds: number }[] {
  const size = rate * seconds;
  const out: { start: number; end: number; seconds: number }[] = [];
  for (let s = 0; s < totalSamples; s += size) {
    const e = Math.min(totalSamples, s + size);
    out.push({ start: s, end: e, seconds: Math.max(1, Math.round((e - s) / rate)) });
  }
  return out;
}

export type PreparedChunk = { index: number; seconds: number; wav: Uint8Array };

export async function decodeToChunks(file: Blob, onProgress?: (p: string) => void): Promise<{ chunks: PreparedChunk[]; totalSeconds: number }> {
  onProgress?.("Reading the audio");
  const raw = await file.arrayBuffer();
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(raw.slice(0));
  await ctx.close();
  onProgress?.("Preparing the audio");
  const frames = Math.ceil(decoded.duration * TARGET_RATE);
  const off = new OfflineAudioContext(1, frames, TARGET_RATE);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const rendered = await off.startRendering();
  const pcm = rendered.getChannelData(0);
  const plan = chunkPlan(pcm.length);
  const chunks = plan.map((p, index) => ({ index, seconds: p.seconds, wav: encodeWav(pcm.subarray(p.start, p.end)) }));
  return { chunks, totalSeconds: chunks.reduce((s, c) => s + c.seconds, 0) };
}
