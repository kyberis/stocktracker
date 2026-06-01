import { test, expect } from "@playwright/test";
import { createTestUser, ensureLoggedOut } from "./helpers";

/**
 * Universal-access quota model (subscription-model-v2):
 *   - Every user, regardless of plan, can hit every feature endpoint.
 *   - Free-tier quotas are conservative; Pro quotas are ~20× higher.
 *   - When a free user exhausts a quota, the API returns HTTP 429 with a
 *     paywall body, but only after the included calls have succeeded.
 */
test.describe("Subscription quotas (v2)", () => {
  test.beforeEach(async ({ request }) => {
    await ensureLoggedOut(request);
  });

  test("/api/auth/me exposes per-feature quota usage", async ({ request }) => {
    await createTestUser(request);

    const meRes = await request.get("/api/auth/me");
    expect(meRes.status()).toBe(200);
    const body = await meRes.json();
    expect(body.user).toBeTruthy();
    expect(body.user.plan).toBe("free");
    expect(body.user.quotas).toBeTruthy();
    // A handful of representative quota keys must be present.
    for (const key of [
      "ai_consult",
      "fundamentals",
      "intelligence",
      "screener",
      "tax_report",
      "csv_export",
      "support_chat",
    ]) {
      expect(body.user.quotas[key]).toBeTruthy();
      expect(typeof body.user.quotas[key].limit).toBe("number");
      expect(typeof body.user.quotas[key].used).toBe("number");
      expect(typeof body.user.quotas[key].remaining).toBe("number");
    }
    // Free user starts with zero usage on every counter.
    for (const v of Object.values(body.user.quotas) as Array<{ used: number }>) {
      expect(v.used).toBe(0);
    }
  });

  test("free user can reach a premium API route (no Pro gate)", async ({ request }) => {
    await createTestUser(request);

    const res = await request.get("/api/screener?meta=1");
    // The endpoint should NOT 401/403 with a "Pro only" paywall for a free
    // signed-in user. It may return 200 or proxy/upstream errors, but never
    // an access-denied paywall body.
    expect(res.status()).not.toBe(401);
    expect(res.status()).not.toBe(403);
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeTruthy();
    }
  });

  test("exceeding a quota returns 429 with a paywall body", async ({ request }) => {
    test.skip(
      !process.env.QUOTA_E2E,
      "Quota-exhaustion E2E requires QUOTA_E2E=1 (calls real OpenAI/FMP endpoints)",
    );
    await createTestUser(request);

    // CSV export has a small free quota (3/month) and no upstream cost.
    let lastStatus = 200;
    for (let i = 0; i < 5; i++) {
      const res = await request.get("/api/export/portfolio?format=csv");
      lastStatus = res.status();
      if (lastStatus === 429) {
        const body = await res.json();
        expect(body.paywall).toBe(true);
        expect(body.reason).toBe("quota_exceeded");
        expect(body.feature).toBe("csv_export");
        if (body.upgradeUrl) {
          expect(body.upgradeUrl).toBe("/billing");
        }
        return;
      }
    }
    throw new Error(`Expected a 429 quota_exceeded eventually, got ${lastStatus}`);
  });
});
