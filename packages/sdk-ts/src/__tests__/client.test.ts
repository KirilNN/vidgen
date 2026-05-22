import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "../index.js";
import type { components } from "../types.gen.js";

/**
 * Acceptance criterion of T-005: "SDK has a `client.GET('/health')` that
 * typechecks." This test exercises both:
 *
 * 1. **Type-level**: the call below would not compile if the generated
 *    `paths` interface did not contain `/health` → GET, or if the response
 *    body was typed differently from `HealthResponse`. `pnpm type-check`
 *    is the gate.
 * 2. **Runtime**: we stub `fetch` and assert that the SDK constructs the
 *    correct request and decodes the response into the typed shape.
 */
describe("@vidgen/sdk-ts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("typechecks and executes client.GET('/health')", async () => {
    const fetchMock = vi.fn(async (input: Request | string | URL) => {
      const url = typeof input === "string" || input instanceof URL ? input.toString() : input.url;
      expect(url).toBe("http://localhost:3001/health");
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const client = createClient({ baseUrl: "http://localhost:3001", fetch: fetchMock });
    const { data, error, response } = await client.GET("/health");

    expect(error).toBeUndefined();
    expect(response.status).toBe(200);
    expect(data).toEqual({ status: "ok" });

    // Type-level assertion: `data` is narrowed to HealthResponse | undefined.
    const typed: components["schemas"]["HealthResponse"] | undefined = data;
    expect(typed?.status).toBe("ok");

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("uses the default baseUrl when none is supplied", async () => {
    const fetchMock = vi.fn(async (input: Request | string | URL) => {
      const url = typeof input === "string" || input instanceof URL ? input.toString() : input.url;
      expect(url).toBe("http://localhost:3001/health");
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const client = createClient({ fetch: fetchMock });
    const { data } = await client.GET("/health");
    expect(data?.status).toBe("ok");
  });
});
