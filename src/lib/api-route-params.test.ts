import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getAppRouteParam } from "./api-route-params";

describe("getAppRouteParam", () => {
  it("reads id from context.params", () => {
    const req = new NextRequest("http://localhost/api/admin/foo/bar");
    expect(getAppRouteParam(req, { params: { id: "abc" } }, "id")).toBe("abc");
  });

  it("falls back to last path segment when params missing (build-time)", () => {
    const req = new NextRequest("http://localhost/api/admin/broker-integration-requests/xyz");
    expect(getAppRouteParam(req, {}, "id")).toBe("xyz");
  });
});
