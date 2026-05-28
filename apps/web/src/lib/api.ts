/**
 * SDK + proxy helpers for calling the Vidgen API from the web app.
 *
 * Two call paths:
 *   1. Server-side, from a Next route handler: `createServerClient()`
 *      returns a typed `@vidgen/sdk-ts` client pointed at
 *      `API_INTERNAL_URL`. Auth headers are attached per-request because
 *      the caller's token comes from the iron-session cookie.
 *   2. Browser-side, via TanStack Query: the client fetches our own
 *      Next `/api/*` proxy routes, which add the Bearer header server-side
 *      so the access_token never leaves the server.
 *
 * `proxyWithBearer` is shared by every proxy route — it strips inbound
 * Authorization / Cookie headers, attaches `Authorization: Bearer
 * <session>`, forwards the body, and passes through status + JSON.
 */
import { createClient, type VidgenClient } from "@vidgen/sdk-ts";
import { getSession, isSessionValid } from "./session";
import { getWebConfig } from "./env";

export function createServerClient(token?: string): VidgenClient {
  const cfg = getWebConfig();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return createClient({ baseUrl: cfg.API_INTERNAL_URL, headers });
}

const PROXY_FORWARD_HEADERS = new Set(["content-type", "accept", "accept-language", "user-agent"]);

function buildForwardHeaders(req: Request, bearer: string): Headers {
  const out = new Headers();
  for (const [k, v] of req.headers.entries()) {
    if (PROXY_FORWARD_HEADERS.has(k.toLowerCase())) {
      out.set(k, v);
    }
  }
  out.set("authorization", `Bearer ${bearer}`);
  return out;
}

export interface ProxyResult {
  response: Response;
  /** True if the session was missing/expired and the caller should clear the cookie + 401. */
  unauthenticated: boolean;
}

export async function proxyWithBearer(
  req: Request,
  upstreamPath: string,
  init: { method: "GET" | "POST"; allowBody?: boolean } = { method: "GET" },
): Promise<ProxyResult> {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return {
      response: new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Unauthenticated",
          status: 401,
        }),
        { status: 401, headers: { "content-type": "application/problem+json" } },
      ),
      unauthenticated: true,
    };
  }

  const cfg = getWebConfig();
  const upstreamUrl = new URL(upstreamPath, cfg.API_INTERNAL_URL);

  const fetchInit: RequestInit = {
    method: init.method,
    headers: buildForwardHeaders(req, session.accessToken),
  };
  if (init.method === "POST" && init.allowBody) {
    fetchInit.body = await req.text();
  }

  const upstream = await fetch(upstreamUrl, fetchInit);

  // Pass through status + body. Re-emit content-type explicitly.
  const responseHeaders = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) responseHeaders.set("content-type", ct);

  return {
    response: new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    }),
    unauthenticated: upstream.status === 401,
  };
}

// Test escape hatches.
export const __internals = { PROXY_FORWARD_HEADERS, buildForwardHeaders };
