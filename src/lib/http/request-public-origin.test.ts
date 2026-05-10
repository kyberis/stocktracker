import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getRequestPublicOrigin, isRequestPublicHttps } from "./request-public-origin";

describe("getRequestPublicOrigin", () => {
  it("uses forwarded host and proto when present", () => {
    const req = new NextRequest("http://127.0.0.1:3010/api/x", {
      headers: {
        "x-forwarded-host": "trefolio-dev.com",
        "x-forwarded-proto": "https",
      },
    });
    expect(getRequestPublicOrigin(req)).toBe("https://trefolio-dev.com");
    expect(isRequestPublicHttps(req)).toBe(true);
  });

  it("treats *.trefolio-dev.com Host as HTTPS when X-Forwarded-Proto is missing (Caddy → Node)", () => {
    const req = new NextRequest("http://127.0.0.1:3010/api/auth/oidc/callback", {
      headers: {
        host: "trefolio-dev.com",
      },
    });
    expect(getRequestPublicOrigin(req)).toBe("https://trefolio-dev.com");
    expect(isRequestPublicHttps(req)).toBe(true);
  });

  it("strips port from trefolio-dev Host for OIDC redirect origin", () => {
    const req = new NextRequest("http://127.0.0.1:3010/x", {
      headers: {
        host: "trefolio-dev.com:3010",
      },
    });
    expect(getRequestPublicOrigin(req)).toBe("https://trefolio-dev.com");
  });

  it("does not rewrite plain localhost", () => {
    const req = new NextRequest("http://localhost:3010/", {
      headers: { host: "localhost:3010" },
    });
    expect(getRequestPublicOrigin(req)).toBe("http://localhost:3010");
    expect(isRequestPublicHttps(req)).toBe(false);
  });
});
