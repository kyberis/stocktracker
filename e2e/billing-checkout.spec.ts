import { test, expect } from "@playwright/test";
import { createTestUser, ensureLoggedOut, loginAsAdmin } from "./helpers";

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
    test.skip(!process.env.STRIPE_E2E, "Stripe E2E tests require STRIPE_E2E=1 (hosted checkout DOM is fragile)");
    test.setTimeout(120_000);

    const creds = await createTestUser(request);

    const checkoutRes = await request.post("/api/billing/checkout", {
      data: { interval: "monthly" },
    });
    expect(checkoutRes.status()).toBe(200);
    const { url } = await checkoutRes.json();
    expect(url).toBeTruthy();

    await page.goto(url);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(5_000);

    const emailInput = page.locator('input[name="email"], #email');
    if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await emailInput.fill(creds.email);
    }

    // Stripe may render card fields inside iframes or as direct inputs
    const cardNumber = page.locator('input[name="cardNumber"], #cardNumber');
    const cardNumberVisible = await cardNumber.isVisible({ timeout: 10_000 }).catch(() => false);

    if (cardNumberVisible) {
      await cardNumber.fill("4242424242424242");

      const cardExpiry = page.locator('input[name="cardExpiry"], #cardExpiry');
      await cardExpiry.fill("1230");

      const cardCvc = page.locator('input[name="cardCvc"], #cardCvc');
      await cardCvc.fill("123");
    } else {
      // Stripe hosted checkout uses iframes — fill via frame locators
      const numberFrame = page.frameLocator('iframe[title*="card number" i]').first();
      await numberFrame.locator('input').first().fill("4242424242424242");

      const expiryFrame = page.frameLocator('iframe[title*="expir" i]').first();
      await expiryFrame.locator('input').first().fill("1230");

      const cvcFrame = page.frameLocator('iframe[title*="cvc" i], iframe[title*="security" i]').first();
      await cvcFrame.locator('input').first().fill("123");
    }

    const billingName = page.locator('input[name="billingName"], #billingName');
    if (await billingName.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await billingName.fill("Test User");
    }

    const submitButton = page.locator(
      'button[type="submit"], .SubmitButton, [data-testid="hosted-payment-submit-button"]',
    );
    await submitButton.click();

    await page.waitForURL(/\/profile\?billing=/, { timeout: 60_000 });
    expect(page.url()).toContain("billing=success");

    await page.waitForTimeout(3_000);

    const meRes = await request.get("/api/auth/me");
    expect(meRes.status()).toBe(200);
    const me = await meRes.json();
    expect(me.user.plan).toBe("pro");
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
