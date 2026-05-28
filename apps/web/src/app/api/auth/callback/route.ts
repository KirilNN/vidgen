/**
 * GET /api/auth/callback — finish the OIDC PKCE flow.
 *
 * 1. Read state + code_verifier from the pre-login cookie.
 * 2. Exchange the authorization code for tokens with Keycloak.
 * 3. Store accessToken + expiry + sub in the iron-session cookie.
 * 4. Redirect to /dashboard (or returnTo if same-origin).
 */
import { NextResponse } from "next/server";
import { exchangeCallback } from "@/lib/auth";
import { getPreLogin, getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const preLogin = await getPreLogin();
  const state = preLogin.state;
  const codeVerifier = preLogin.codeVerifier;
  const returnTo = preLogin.returnTo;
  await preLogin.destroy();

  if (!state || !codeVerifier) {
    return NextResponse.redirect(new URL("/login?error=missing_prelogin", req.url));
  }

  try {
    const tokens = await exchangeCallback({
      currentUrl: new URL(req.url),
      state,
      codeVerifier,
    });

    const session = await getSession();
    session.accessToken = tokens.accessToken;
    session.expiresAtSec = Math.floor(Date.now() / 1000) + tokens.expiresInSec;
    if (tokens.sub) session.sub = tokens.sub;
    await session.save();

    const target =
      returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard";
    return NextResponse.redirect(new URL(target, req.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(
      new URL(`/login?error=callback_failed&detail=${encodeURIComponent(message)}`, req.url),
    );
  }
}
