// Node: decode any clip to 16 kHz mono WAV chunks with ffmpeg, and serve them from 127.0.0.1 or upload to Blob.
import { spawnSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { chunkPlan, encodeWav } from "../../lib/transcribe/chunk";

export function decodeClip(path: string): { chunks: { index: number; seconds: number; wav: Uint8Array }[]; totalSeconds: number } {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr?.toString().slice(0, 200)}`);
  const pcm = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.byteLength));
  const plan = chunkPlan(pcm.length);
  const chunks = plan.map((p, index) => ({ index, seconds: p.seconds, wav: encodeWav(pcm.subarray(p.start, p.end)) }));
  return { chunks, totalSeconds: chunks.reduce((s, c) => s + c.seconds, 0) };
}

export async function hostChunks(jobId: string, chunks: { index: number; wav: Uint8Array; seconds: number }[]): Promise<{ urls: { url: string; seconds: number }[]; close: () => void }> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const urls: { url: string; seconds: number }[] = [];
    for (const c of chunks) {
      const b = await put(`chunks/${jobId}/${c.index}.wav`, Buffer.from(c.wav), { access: "public", contentType: "audio/wav", addRandomSuffix: true });
      urls.push({ url: b.url, seconds: c.seconds });
    }
    return { urls, close: () => undefined };
  }
  const srv: Server = createServer((req, res) => {
    const i = Number((req.url ?? "").replace(/\D/g, ""));
    const c = chunks[i];
    if (!c) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": "audio/wav" }).end(Buffer.from(c.wav));
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  const port = (srv.address() as { port: number }).port;
  return { urls: chunks.map((c) => ({ url: `http://127.0.0.1:${port}/${c.index}`, seconds: c.seconds })), close: () => srv.close() };
}
