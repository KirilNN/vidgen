import { describe, expect, it } from "vitest";
import { __internals } from "@/lib/api";

describe("proxy forward-header policy", () => {
  it("forwards a small allow-list and always overrides Authorization", () => {
    const req = new Request("https://app.example.com/api/me", {
      method: "GET",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        cookie: "vidgen.session=tampered",
        authorization: "Bearer attacker-token",
        "x-forwarded-for": "1.2.3.4",
      },
    });
    const headers = __internals.buildForwardHeaders(req, "real-session-token");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("authorization")).toBe("Bearer real-session-token");
    // Cookies / arbitrary headers are stripped.
    expect(headers.get("cookie")).toBeNull();
    expect(headers.get("x-forwarded-for")).toBeNull();
  });

  it("attaches Authorization even when the inbound request has none", () => {
    const req = new Request("https://app.example.com/api/me", { method: "GET" });
    const headers = __internals.buildForwardHeaders(req, "session-tok");
    expect(headers.get("authorization")).toBe("Bearer session-tok");
  });
});
