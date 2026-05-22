import { describe, expect, it } from "vitest";
import { getOpenApiDocument, openapiSpecPath } from "../openapi.js";

describe("services/api openapi", () => {
  it("exposes the spec file path", () => {
    expect(openapiSpecPath.endsWith("openapi.yaml")).toBe(true);
  });

  it("returns a 3.1 document with a /health GET operation", () => {
    const doc = getOpenApiDocument();
    expect(doc.openapi).toMatch(/^3\.1/);
    const health = (doc.paths as Record<string, Record<string, unknown>>)["/health"];
    expect(health).toBeDefined();
    expect(health!["get"]).toBeDefined();
  });
});
