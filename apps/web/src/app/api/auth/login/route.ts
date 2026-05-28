/**
 * GET /api/auth/login — start the OIDC PKCE flow.
 *
 * 1. Generate state + PKCE code_verifier.
 * 2. Stash them in the pre-login cookie (sealed by APP_SECRET).
 * 3. Redirect the browser to Keycloak's authorize endpoint.
 */
import { NextResponse } from "next/server";
import { buildLoginUrl, generatePkce } from "@/lib/auth";
import { getPreLogin } from "@/lib/session";
import { getWebConfig } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const cfg = getWebConfig();
  const { state, codeVerifier } = generatePkce();

  // Same-origin returnTo only.
  let returnTo: string | undefined;
  try {
    const url = new URL(req.url);
    const rt = url.searchParams.get("returnTo");
    if (rt && rt.startsWith("/") && !rt.startsWith("//")) {
      returnTo = rt;
    }
  } catch {
    /* ignore malformed */
  }

  const preLogin = await getPreLogin();
  preLogin.state = state;
  preLogin.codeVerifier = codeVerifier;
  if (returnTo) preLogin.returnTo = returnTo;
  await preLogin.save();

  const redirectUri = new URL("/api/auth/callback", cfg.WEB_PUBLIC_URL).toString();
  const authorizeUrl = await buildLoginUrl({ state, codeVerifier, redirectUri });
  return NextResponse.redirect(authorizeUrl);
}
