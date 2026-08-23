import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  verifySessionToken: vi.fn(),
}));

vi.mock("@/lib/log-unauthorized", () => ({
  logUnauthorizedApi: vi.fn(),
}));

describe("middleware prodops routes", () => {
  it("allows ProdOps link completion without a session cookie", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(
      new NextRequest("http://localhost/api/admin/prodops-config/link/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ProdOps-Timestamp": "1716670000",
          "X-ProdOps-Signature": "sha256=test",
        },
        body: JSON.stringify({ token: "abc", chatId: "123" }),
      }),
    );

    expect(response.status).not.toBe(401);
  });

  it("allows ProdOps staff queries without a session cookie", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(
      new NextRequest("http://localhost/api/internal/prodops-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ProdOps-Timestamp": "1716670000",
          "X-ProdOps-Signature": "sha256=test",
        },
        body: JSON.stringify({ chatId: "123", queryType: "latest_user_created" }),
      }),
    );

    expect(response.status).not.toBe(401);
  });

  it("allows portfolio-anomaly-scan cron without a session cookie", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(
      new NextRequest("http://localhost/api/cron/portfolio-anomaly-scan", {
        method: "GET",
        headers: {
          Authorization: "Bearer cron-secret",
        },
      }),
    );

    expect(response.status).not.toBe(401);
  });

  it("allows support-return-watch cron without a session cookie", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(
      new NextRequest("http://localhost/api/cron/support-return-watch", {
        method: "GET",
        headers: {
          Authorization: "Bearer cron-secret",
        },
      }),
    );

    expect(response.status).not.toBe(401);
  });

  it("allows lifecycle-emails cron without a session cookie", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(
      new NextRequest("http://localhost/api/cron/lifecycle-emails", {
        method: "GET",
        headers: {
          Authorization: "Bearer cron-secret",
        },
      }),
    );

    expect(response.status).not.toBe(401);
  });

  it("allows prodops dispatch cron without a session cookie", async () => {
    const { middleware } = await import("./middleware");
    const response = await middleware(
      new NextRequest("http://localhost/api/cron/prodops-dispatch", {
        method: "POST",
        headers: {
          Authorization: "Bearer cron-secret",
        },
      }),
    );

    expect(response.status).not.toBe(401);
  });
});
