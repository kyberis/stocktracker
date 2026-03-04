import { test, expect } from "@playwright/test";
import { loginAsAdmin, createTestUser, ensureLoggedOut } from "./helpers";

test.describe("Admin Panel", () => {
  test.beforeEach(async ({ request }) => {
    const ok = await loginAsAdmin(request);
    if (!ok) test.skip();
  });

  test("list users (admin only)", async ({ request }) => {
    const res = await request.get("/api/admin/users");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("users");
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.users.length).toBeGreaterThanOrEqual(1);
    expect(body.users.some((u: { role: string }) => u.role === "admin")).toBe(true);
  });

  test("non-admin cannot access admin endpoints", async ({ request }) => {
    await ensureLoggedOut(request);
    const { password } = await createTestUser(request);

    const res = await request.get("/api/admin/users");
    expect(res.status()).toBe(403);

    await request.post("/api/auth/delete-account", { data: { password } });
  });

  test("get Alpha Vantage API key (masked)", async ({ request }) => {
    const res = await request.get("/api/admin/api-key");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("hasKey");
  });

  test("get OpenAI API key (masked)", async ({ request }) => {
    const res = await request.get("/api/admin/openai-key");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("hasKey");
  });

  test("set and clear Alpha Vantage API key", async ({ request }) => {
    const setRes = await request.put("/api/admin/api-key", {
      data: { apiKey: "test-av-key-12345" },
    });
    expect(setRes.status()).toBe(200);

    const getRes = await request.get("/api/admin/api-key");
    const body = await getRes.json();
    expect(body.hasKey).toBe(true);

    const clearRes = await request.put("/api/admin/api-key", {
      data: { apiKey: "" },
    });
    expect(clearRes.status()).toBe(200);
  });

  test("reset user data (seed mode)", async ({ request }) => {
    await ensureLoggedOut(request);
    const { password } = await createTestUser(request);

    const me = await request.get("/api/auth/me");
    const meBody = await me.json();
    const userId = meBody.user.id;

    await ensureLoggedOut(request);
    await loginAsAdmin(request);

    const resetRes = await request.post("/api/admin/reset-data", {
      data: { userId, mode: "seed" },
    });
    expect(resetRes.status()).toBe(200);
  });

  test("analytics endpoint returns data", async ({ request }) => {
    const res = await request.get("/api/admin/analytics");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("totalEvents");
  });
});
