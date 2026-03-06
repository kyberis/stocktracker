import { test, expect } from "@playwright/test";
import { createTestUser, ensureLoggedOut } from "./helpers";

test.describe("Billing checkout (Stripe test mode)", () => {
  test.beforeEach(async ({ request }) => {
    await ensureLoggedOut(request);
  });

  test("checkout API returns a valid Stripe URL", async ({ request }) => {
    await createTestUser(request);
    const res = await request.post("/api/billing/checkout", {
      data: { interval: "monthly" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.url).toBeTruthy();
    expect(body.url).toContain("checkout.stripe.com");
  });

  test("full checkout flow with test card upgrades to Pro", async ({ page, request }) => {
    test.setTimeout(90_000);

    const creds = await createTestUser(request);

    const checkoutRes = await request.post("/api/billing/checkout", {
      data: { interval: "monthly" },
    });
    expect(checkoutRes.status()).toBe(200);
    const { url } = await checkoutRes.json();
    expect(url).toBeTruthy();

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[name="email"], #email');
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(creds.email);
    }

    const cardNumber = page.locator('input[name="cardNumber"], #cardNumber');
    await cardNumber.waitFor({ state: "visible", timeout: 15_000 });
    await cardNumber.fill("4242424242424242");

    const cardExpiry = page.locator('input[name="cardExpiry"], #cardExpiry');
    await cardExpiry.fill("1230");

    const cardCvc = page.locator('input[name="cardCvc"], #cardCvc');
    await cardCvc.fill("123");

    const billingName = page.locator('input[name="billingName"], #billingName');
    if (await billingName.isVisible().catch(() => false)) {
      await billingName.fill("Test User");
    }

    const submitButton = page.locator(
      'button[type="submit"], .SubmitButton, [data-testid="hosted-payment-submit-button"]',
    );
    await submitButton.click();

    await page.waitForURL(/\/profile\?billing=/, { timeout: 30_000 });
    expect(page.url()).toContain("billing=success");

    await page.waitForTimeout(3_000);

    const meRes = await request.get("/api/auth/me");
    expect(meRes.status()).toBe(200);
    const me = await meRes.json();
    expect(me.user.plan).toBe("pro");
  });

  test("capacity endpoint reflects available Pro slots", async ({ request }) => {
    await createTestUser(request);
    const res = await request.get("/api/billing/capacity");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.maxCount).toBe(500);
    expect(typeof body.remaining).toBe("number");
  });
});
