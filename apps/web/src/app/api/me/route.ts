/**
 * GET /api/me — proxy to upstream GET /me, attaching the session's
 * Bearer token. The access_token never leaves the server.
 */
import { proxyWithBearer } from "@/lib/api";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const result = await proxyWithBearer(req, "/me", { method: "GET" });
  if (result.unauthenticated) {
    // Clear stale cookie so the next navigation goes through /login cleanly.
    const session = await getSession();
    await session.destroy();
  }
  return result.response;
}
