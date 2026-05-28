/**
 * GET  /api/workspaces  — list the caller's workspaces (proxied).
 * POST /api/workspaces  — create a new workspace (proxied).
 *
 * Both routes attach the Bearer token from the iron-session cookie before
 * forwarding to `services/api`. The body of the POST is passed through
 * verbatim; Fastify enforces the JSON-schema (name, 1–200 chars).
 */
import { proxyWithBearer } from "@/lib/api";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function maybeDestroyOn401(unauthenticated: boolean): Promise<void> {
  if (!unauthenticated) return;
  const session = await getSession();
  await session.destroy();
}

export async function GET(req: Request) {
  const r = await proxyWithBearer(req, "/workspaces", { method: "GET" });
  await maybeDestroyOn401(r.unauthenticated);
  return r.response;
}

export async function POST(req: Request) {
  const r = await proxyWithBearer(req, "/workspaces", { method: "POST", allowBody: true });
  await maybeDestroyOn401(r.unauthenticated);
  return r.response;
}
