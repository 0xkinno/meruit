import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const runtime = "nodejs";

/** Client-side uploads of 60 s WAV chunks straight to Blob (function bodies are capped at 4.5 MB). */
export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "blob_not_configured" }, { status: 503 });
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body, request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^chunks\/[a-zA-Z0-9_-]{8,64}\/\d{1,3}\.wav$/.test(pathname)) throw new Error("path_not_allowed");
        return { allowedContentTypes: ["audio/wav", "audio/x-wav"], maximumSizeInBytes: 3_000_000, addRandomSuffix: true };
      },
      onUploadCompleted: async () => undefined,
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
