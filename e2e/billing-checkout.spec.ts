import { test, expect } from "@playwright/test";
import { createTestUser, ensureLoggedOut, loginAsAdmin } from "./helpers";

test.describe("Billing (Stripe / IdP)", () => {
  test.beforeEach(async ({ request }) => {
    await ensureLoggedOut(request);
  });

  test("legacy Pro checkout API removed (upgrade on user.trefolio.com)", async ({ request }) => {
    await createTestUser(request);
    const res = await request.post("/api/billing/checkout", {
      data: { interval: "monthly" },
    });
    expect(res.status()).toBe(404);
  });

  test("full hosted Stripe checkout for Pro (IdP)", async () => {
    test.skip(
      true,
      "Pro checkout is hosted on user.trefolio.com; run IdP browser E2E separately.",
    );
  });

  test("capacity endpoint reflects available Pro slots", async ({ request }) => {
    await loginAsAdmin(request);
    const res = await request.get("/api/billing/capacity");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(typeof body.maxCount).toBe("number");
    expect(typeof body.remaining).toBe("number");
  });
});
