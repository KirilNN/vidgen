/**
 * Session storage for the web app. iron-session seals the payload into an
 * httpOnly cookie keyed by `APP_SECRET`; nothing is stored server-side.
 *
 * Payload (deliberately minimal):
 *   - accessToken: the Keycloak access token used to call the API.
 *   - expiresAtSec: epoch-second deadline; once past, the session is
 *     treated as expired and the cookie cleared.
 *   - sub: the upstream Keycloak `sub` claim (for diagnostics only).
 *
 * No refresh token — token TTL is short (~15 min per the dev realm) and
 * we force re-login on expiry. Refresh + server-backed session is a
 * follow-up (see `apps/web/README.md`).
 */
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies as nextCookies } from "next/headers";
import { getWebConfig } from "./env";

export interface WebSession {
  accessToken?: string;
  expiresAtSec?: number;
  sub?: string;
}

export interface PreLoginCookie {
  state?: string;
  codeVerifier?: string;
  returnTo?: string;
}

const SESSION_COOKIE_NAME = "vidgen.session";
const PRELOGIN_COOKIE_NAME = "vidgen.prelogin";

function sessionOptions(): SessionOptions {
  const cfg = getWebConfig();
  const secure = cfg.WEB_PUBLIC_URL.startsWith("https://");
  return {
    cookieName: SESSION_COOKIE_NAME,
    password: cfg.APP_SECRET,
    cookieOptions: {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    },
  };
}

function preLoginOptions(): SessionOptions {
  const cfg = getWebConfig();
  const secure = cfg.WEB_PUBLIC_URL.startsWith("https://");
  return {
    cookieName: PRELOGIN_COOKIE_NAME,
    password: cfg.APP_SECRET,
    cookieOptions: {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    },
  };
}

// iron-session v8's CookieStore type differs subtly from Next 15's
// ReadonlyRequestCookies under exactOptionalPropertyTypes. The runtime
// values are identical — iron-session's docs explicitly say to pass
// `await cookies()` here — so we cast through unknown. This is the
// single sanctioned place to do so.
export async function getSession(): Promise<IronSession<WebSession>> {
  const store = await nextCookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getIronSession<WebSession>(store as unknown as any, sessionOptions());
}

export async function getPreLogin(): Promise<IronSession<PreLoginCookie>> {
  const store = await nextCookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getIronSession<PreLoginCookie>(store as unknown as any, preLoginOptions());
}

export function isSessionValid(
  s: WebSession | null | undefined,
): s is WebSession & { accessToken: string; expiresAtSec: number } {
  if (!s?.accessToken || !s?.expiresAtSec) return false;
  return s.expiresAtSec > Math.floor(Date.now() / 1000);
}

export const __internals = {
  sessionOptions,
  preLoginOptions,
  SESSION_COOKIE_NAME,
  PRELOGIN_COOKIE_NAME,
};
