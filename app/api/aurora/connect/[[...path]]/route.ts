import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-side proxy to the Intents Connect API (intents-connect-api.aurora.dev, open; no key needed to read).
 * The browser calls /api/aurora/connect/api/v1/executions/...; creating a bridge-in needs the Aurora API key in
 * `x-api-key`, which is added here so the key never reaches the browser. Only execution paths are forwarded.
 */
async function proxy(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  void ctx;
  const base = (process.env.AURORA_CONNECT_BASE_URL || "https://intents-connect-api.aurora.dev").replace(/\/$/, "");
  const path = req.nextUrl.pathname.replace(/^\/api\/aurora\/connect/, "");
  if (!/^\/api\/v1\/executions\//.test(path)) return NextResponse.json({ error: "path_not_allowed" }, { status: 400 });
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (req.method === "POST" && process.env.AURORA_API_KEY) headers["x-api-key"] = process.env.AURORA_API_KEY;
  const r = await fetch(`${base}${path}${req.nextUrl.search}`, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
    cache: "no-store",
  });
  return new NextResponse(await r.text(), { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "application/json" } });
}
export { proxy as GET, proxy as POST };
