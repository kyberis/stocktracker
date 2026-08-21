import { test, expect } from "@playwright/test";
import {
  adoptApiSessionInBrowser,
  createTestUser,
  ensureLoggedOut,
  dismissOverlays,
} from "./helpers";

test.describe("Widget setup Scriptable variants", () => {
  test.beforeEach(async ({ request }) => {
    await ensureLoggedOut(request);
  });

  test("user can switch to top movers script and see the movers file preview", async ({
    page,
    request,
    context,
  }) => {
    await createTestUser(request);
    await adoptApiSessionInBrowser(request, context);
    await page.goto("/widget/setup");
    await dismissOverlays(page);
    await expect(page.getByRole("heading", { name: /Widget Setup/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("tab", { name: /^iOS$/ }).click();
    await expect(page.getByText(/Home Screen Widget \(Scriptable\)/i)).toBeVisible();

    const portfolioRadio = page.getByRole("radio", { name: /Portfolio summary/i });
    const moversRadio = page.getByRole("radio", { name: /Top movers/i });
    await expect(portfolioRadio).toBeVisible();
    await expect(moversRadio).toBeVisible();
    await expect(portfolioRadio).toHaveAttribute("aria-checked", "true");

    await moversRadio.click();
    await expect(moversRadio).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("trefolio-scriptable-movers.js")).toBeVisible();
    await expect(
      page.getByText(/Top Movers Widget for Scriptable/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("button", { name: /Copy Script/i })).toBeEnabled();
  });

  test("widget setup is linked from profile devices tab without device flag", async ({
    page,
    request,
    context,
  }) => {
    await createTestUser(request);
    await adoptApiSessionInBrowser(request, context);
    await page.goto("/profile?section=devices");
    await dismissOverlays(page);

    await expect(page.getByRole("tab", { name: /Widget/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Home screen widget|Widget en pantalla/i })).toBeVisible();
    const setupCta = page.getByRole("link", { name: /Set up widget|Configurar widget/i });
    await expect(setupCta).toBeVisible();
    await setupCta.click();
    await expect(page.getByRole("heading", { name: /Widget Setup/i })).toBeVisible({ timeout: 15_000 });
  });

  test("movers script file is served publicly", async ({ request }) => {
    const res = await request.get("/widget/trefolio-scriptable-movers.js");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("pickTopMovers");
    expect(body).toContain("full=true");
    expect(body).toContain("widgetFamily");
    expect(body).toContain("YOUR_TOKEN_HERE");
  });
});
