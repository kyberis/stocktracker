import { test, expect } from "@playwright/test";

/**
 * Lightweight checks complementing docs/SECURITY_AUDIT.md (DAST remains manual).
 */
test.describe("API auth smoke", () => {
  test("protected portfolio API returns 401 without session cookie", async ({ request }) => {
    const res = await request.get("/api/holdings");
    expect(res.status()).toBe(401);
  });

  test("session endpoint returns 401 without cookie", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    expect(res.status()).toBe(401);
  });
});
