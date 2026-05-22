import { describe, expect, it } from "vitest";
import { loadOpenApiDocument, openapiSpecPath } from "../index.js";

describe("@vidgen/openapi", () => {
  it("exposes the spec file path", () => {
    expect(openapiSpecPath.endsWith("openapi.yaml")).toBe(true);
  });

  it("loads a valid OpenAPI 3.1 document with /health GET", () => {
    const doc = loadOpenApiDocument({ fresh: true });
    expect(doc.openapi).toMatch(/^3\.1/);
    expect(doc.info.title).toBe("Vidgen API");
    const health = (doc.paths as Record<string, Record<string, unknown>>)["/health"];
    expect(health).toBeDefined();
    expect(health!["get"]).toBeDefined();
  });

  it("caches by default and refreshes when asked", () => {
    const a = loadOpenApiDocument();
    const b = loadOpenApiDocument();
    const c = loadOpenApiDocument({ fresh: true });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
