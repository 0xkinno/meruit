import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy target for the Intents Connect SDK (`apiKeyProxyUrl`), so the key never reaches the browser.
 * Intents Connect is pre-release and needs access from the Aurora team. Without AURORA_CONNECT_BASE_URL
 * this route answers 501 and the UI labels Connect as designed, not live.
 */
async function proxy(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  void ctx;
  const base = process.env.AURORA_CONNECT_BASE_URL;
  if (!base || !process.env.AURORA_API_KEY) return NextResponse.json({ error: "connect_not_configured", state: "designed" }, { status: 501 });
  const path = req.nextUrl.pathname.replace(/^\/api\/aurora\/connect/, "");
  if (!/^\/api\/v1\/executions\//.test(path)) return NextResponse.json({ error: "path_not_allowed" }, { status: 400 });
  const r = await fetch(`${base.replace(/\/$/, "")}${path}${req.nextUrl.search}`, {
    method: req.method,
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.AURORA_API_KEY}` },
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
    cache: "no-store",
  });
  return new NextResponse(await r.text(), { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "application/json" } });
}
export { proxy as GET, proxy as POST };
