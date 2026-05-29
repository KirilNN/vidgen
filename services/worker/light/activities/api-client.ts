/**
 * services/worker/light/activities/api-client — internal HTTP client
 * for worker → API metadata writes (T-031).
 *
 * The light pool's activities POST to `/internal/assets` and
 * `/internal/renditions` to commit the rows the IngestAssetWorkflow
 * produces. Direct DB access from the worker would couple the worker
 * to Postgres + Drizzle (architecture violation: storage is an
 * adapter, the API owns metadata writes).
 *
 * Auth is the same HMAC shared token tusd uses
 * (`API_INTERNAL_TOKEN`, falls back to `APP_SECRET`).
 *
 * Architecture refs:
 *   - §5.1 — Postgres metadata only; the API owns the writer role.
 *   - §6.2 — light pool = orchestration; activities call services
 *            via narrow interfaces.
 *   - §11  — workspace_id is in every request body; the API verifies
 *            it via `withWorkspace`.
 */
import { setTimeout as sleep } from "node:timers/promises";

const INTERNAL_TOKEN_HEADER = "x-vidgen-internal-token";

export interface ApiClientOptions {
  baseUrl: string;
  token: string;
  /** Per-request timeout in ms; defaults to 10s. */
  timeoutMs?: number;
  /** Retries on 5xx / network errors; defaults to 3 (1 attempt + 2 retries). */
  retries?: number;
}

export interface InternalApiClient {
  postAsset(input: PostAssetInput): Promise<PostAssetResult>;
  postRendition(input: PostRenditionInput): Promise<PostRenditionResult>;
}

export interface PostAssetInput {
  workspace_id: string;
  asset_id?: string;
  source_uri: string;
  sha256: string;
  mime: string;
  duration_ms?: number | null;
  created_by?: string | null;
  captured_via?: string | null;
  tier_at_upload?: string | null;
}

export interface PostAssetResult {
  asset_id: string;
  workspace_id: string;
  source_uri: string;
  sha256: string;
  mime: string;
  duration_ms: number | null;
  deduped: boolean;
}

export interface PostRenditionInput {
  workspace_id: string;
  asset_id: string;
  kind: string;
  uri: string;
  params_json?: Record<string, unknown>;
}

export interface PostRenditionResult {
  rendition_id: string;
  asset_id: string;
  workspace_id: string;
  kind: string;
  uri: string;
}

/**
 * Build a small fetch-based client with simple exponential backoff for
 * 5xx / network errors. We do NOT retry on 4xx — those are
 * programming bugs that retries would only mask.
 */
export function createInternalApiClient(opts: ApiClientOptions): InternalApiClient {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const maxAttempts = Math.max(1, opts.retries ?? 3);

  async function request<TIn, TOut>(path: string, body: TIn): Promise<TOut> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${base}${path}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            [INTERNAL_TOKEN_HEADER]: opts.token,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.status >= 200 && res.status < 300) {
          return (await res.json()) as TOut;
        }
        if (res.status >= 400 && res.status < 500) {
          const text = await res.text().catch(() => "(no body)");
          throw new Error(`api ${path} returned ${res.status}: ${text}`);
        }
        lastErr = new Error(`api ${path} returned ${res.status}`);
      } catch (err) {
        clearTimeout(timer);
        lastErr = err;
      }
      if (attempt < maxAttempts) {
        await sleep(200 * 2 ** (attempt - 1));
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error(`api ${path} failed after ${maxAttempts} attempts`);
  }

  return {
    async postAsset(input) {
      return request<PostAssetInput, PostAssetResult>("/internal/assets", input);
    },
    async postRendition(input) {
      return request<PostRenditionInput, PostRenditionResult>("/internal/renditions", input);
    },
  };
}

let cachedClient: InternalApiClient | undefined;

/**
 * Lazy default client wired from env. Tests use
 * `__setInternalApiClientForTests` to inject a fake.
 */
export function getInternalApiClient(): InternalApiClient {
  if (cachedClient) return cachedClient;
  const baseUrl = process.env["API_INTERNAL_URL"];
  // Empty string is a possible compose-injected value when the env var
  // is declared without a default. Treat blank as "fall through to
  // APP_SECRET" instead of failing the activity at runtime.
  const tokenRaw = process.env["API_INTERNAL_TOKEN"];
  const token = tokenRaw && tokenRaw.length > 0 ? tokenRaw : process.env["APP_SECRET"];
  if (!baseUrl) {
    throw new Error("api-client: API_INTERNAL_URL is required");
  }
  if (!token) {
    throw new Error("api-client: API_INTERNAL_TOKEN or APP_SECRET is required");
  }
  cachedClient = createInternalApiClient({ baseUrl, token });
  return cachedClient;
}

/** @internal */
export function __setInternalApiClientForTests(client: InternalApiClient | undefined): void {
  cachedClient = client;
}
