/**
 * Keycloak OIDC client for the web app (openid-client v6).
 *
 * Uses the Authorization Code + PKCE flow against the `app-web` PUBLIC
 * client configured in `infra/compose/keycloak/realm-export.json`. No
 * client secret is sent (None auth method).
 *
 * Issuer is `KEYCLOAK_PUBLIC_ISSUER_URL` — the **same** URL the API
 * container validates the `iss` claim against. This avoids the classic
 * dual-issuer trap where the browser sees one issuer and the API another.
 *
 * Architecture refs:
 *   - decisions.md ADR-0006: Keycloak as OIDC IDP for dev + prod.
 *   - architecture.md §11.3: PKCE for public clients.
 */
import * as oidc from "openid-client";
import { getWebConfig } from "./env";

let cachedConfig: oidc.Configuration | undefined;
let cachedConfigKey: string | undefined;

async function getConfig(): Promise<oidc.Configuration> {
  const cfg = getWebConfig();
  const key = `${cfg.KEYCLOAK_PUBLIC_ISSUER_URL}|${cfg.KEYCLOAK_CLIENT_ID_WEB}`;
  if (cachedConfig && cachedConfigKey === key) return cachedConfig;

  const server = new URL(cfg.KEYCLOAK_PUBLIC_ISSUER_URL);
  // openid-client v6 refuses non-HTTPS issuer URLs by default — including
  // the discovery call itself. The dev compose stack uses
  // http://localhost:8080/realms/app (matches the direct Keycloak
  // port-binding used by api-smoke.sh); production deployments must use
  // HTTPS and this branch is a no-op.
  const discoveryOpts =
    server.protocol === "http:" ? { execute: [oidc.allowInsecureRequests] } : undefined;
  cachedConfig = await oidc.discovery(
    server,
    cfg.KEYCLOAK_CLIENT_ID_WEB,
    undefined,
    oidc.None(),
    discoveryOpts,
  );
  cachedConfigKey = key;
  return cachedConfig;
}

export interface PkceMaterial {
  state: string;
  codeVerifier: string;
}

export function generatePkce(): PkceMaterial {
  return {
    state: oidc.randomState(),
    codeVerifier: oidc.randomPKCECodeVerifier(),
  };
}

export async function codeChallengeFor(verifier: string): Promise<string> {
  return oidc.calculatePKCECodeChallenge(verifier);
}

export async function buildLoginUrl(params: {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  scope?: string;
}): Promise<URL> {
  const config = await getConfig();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(params.codeVerifier);
  return oidc.buildAuthorizationUrl(config, {
    redirect_uri: params.redirectUri,
    scope: params.scope ?? "openid profile email",
    state: params.state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
}

export interface TokenResponse {
  accessToken: string;
  expiresInSec: number;
  idToken?: string;
  sub?: string;
}

export async function exchangeCallback(params: {
  currentUrl: URL;
  state: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const config = await getConfig();
  const tokens = await oidc.authorizationCodeGrant(config, params.currentUrl, {
    expectedState: params.state,
    pkceCodeVerifier: params.codeVerifier,
  });
  const claims = tokens.claims();
  const expiresInSec = typeof tokens.expires_in === "number" ? tokens.expires_in : 900;
  const result: TokenResponse = {
    accessToken: tokens.access_token,
    expiresInSec,
  };
  if (typeof tokens.id_token === "string") result.idToken = tokens.id_token;
  if (typeof claims?.sub === "string") result.sub = claims.sub;
  return result;
}

export async function buildLogoutUrl(params: {
  postLogoutRedirectUri: string;
  idTokenHint?: string;
}): Promise<URL> {
  const config = await getConfig();
  return oidc.buildEndSessionUrl(config, {
    post_logout_redirect_uri: params.postLogoutRedirectUri,
    ...(params.idTokenHint ? { id_token_hint: params.idTokenHint } : {}),
  });
}

// Test escape hatch — clears cached discovery between tests.
export function __resetAuthForTests(): void {
  cachedConfig = undefined;
  cachedConfigKey = undefined;
}
