import { describe, expect, it } from "vitest";
import { getOpenApiDocument, openapiSpecPath } from "../openapi.js";

describe("services/api openapi", () => {
  it("exposes the spec file path", () => {
    expect(openapiSpecPath.endsWith("openapi.yaml")).toBe(true);
  });

  it("returns a 3.1 document with the four T-015 endpoints", () => {
    const doc = getOpenApiDocument();
    expect(doc.openapi).toMatch(/^3\.1/);
    const paths = doc.paths as Record<string, Record<string, unknown>>;

    // /health is public; the response payload now carries {ok, version, ts}.
    const health = paths["/health"];
    expect(health).toBeDefined();
    expect(health!["get"]).toBeDefined();
    const healthResponse = (doc.components?.schemas as Record<string, unknown> | undefined)?.[
      "HealthResponse"
    ];
    expect(healthResponse).toBeDefined();
    const requiredFields = (healthResponse as { required: string[] }).required;
    expect(requiredFields).toEqual(expect.arrayContaining(["ok", "version", "ts"]));

    // /me + /workspaces both come with a BearerAuth security requirement.
    const me = paths["/me"];
    expect(me).toBeDefined();
    expect(me!["get"]).toBeDefined();

    const workspaces = paths["/workspaces"];
    expect(workspaces).toBeDefined();
    expect(workspaces!["get"]).toBeDefined();
    expect(workspaces!["post"]).toBeDefined();

    const securitySchemes = doc.components?.securitySchemes as Record<string, unknown> | undefined;
    expect(securitySchemes?.["BearerAuth"]).toBeDefined();
  });
});
