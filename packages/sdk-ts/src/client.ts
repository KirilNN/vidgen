/**
 * Typed client factory. Thin wrapper around `openapi-fetch` so callers depend
 * on `@vidgen/sdk-ts`, not on the underlying HTTP library — which lets us
 * swap implementations (eg add retry, tracing, auth interceptors) later
 * without breaking call sites.
 */
import createOpenapiFetch, { type Client, type ClientOptions } from "openapi-fetch";
import type { paths } from "./types.gen.js";

export type VidgenClient = Client<paths>;

export interface CreateClientOptions extends ClientOptions {
  /**
   * Base URL of the Vidgen API. Defaults to `http://localhost:3001`
   * (the value `API_PUBLIC_URL` defaults to in `@vidgen/config`).
   */
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "http://localhost:3001";

export function createClient(options: CreateClientOptions = {}): VidgenClient {
  const { baseUrl = DEFAULT_BASE_URL, ...rest } = options;
  return createOpenapiFetch<paths>({ baseUrl, ...rest });
}
