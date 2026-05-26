import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  verifySessionToken: vi.fn(),
}));

vi.mock("@/lib/log-unauthorized", () => ({
  logUnauthorizedApi: vi.fn(),
}));

import { verifySessionToken } from "@/lib/auth/session";
import { logUnauthorizedApi } from "@/lib/log-unauthorized";

const mockVerifySessionToken = vi.mocked(verifySessionToken);
const mockLogUnauthorizedApi = vi.mocked(logUnauthorizedApi);

describe("middleware auth redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySessionToken.mockResolvedValue(null);
  });

  it("redirects unauthenticated protected pages to login with redirect preserved", async () => {
    const { middleware } = await import("./middleware");

    const response = await middleware(
      new NextRequest("http://localhost/chats?filter=unread"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?redirect=%2Fchats%3Ffilter%3Dunread",
    );
  });

  it("keeps api requests as 401 json responses", async () => {
    const { middleware } = await import("./middleware");

    const response = await middleware(
      new NextRequest("http://localhost/api/chats"),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();
    expect(mockLogUnauthorizedApi).toHaveBeenCalledOnce();
  });

  it("keeps the landing rewrite for root", async () => {
    const { middleware } = await import("./middleware");

    const response = await middleware(
      new NextRequest("http://localhost/"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost/landing");
  });
});
