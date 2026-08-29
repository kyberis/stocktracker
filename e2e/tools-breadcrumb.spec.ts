import { test, expect } from "@playwright/test";
import { createTestUser, loginViaUI, dismissOverlays } from "./helpers";

const TEST_PASS = "TestPass123!";

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

test.describe("Tools breadcrumb mobile layout", () => {
  test("icon, label, and back control do not overlap on narrow screens", async ({ page, request }) => {
    const user = await createTestUser(request, false);
    await page.setViewportSize({ width: 375, height: 812 });
    await loginViaUI(page, user.email, TEST_PASS);
    await dismissOverlays(page);

    await page.goto("/tools/transactions", { waitUntil: "domcontentloaded" });
    await dismissOverlays(page);

    const crumb = page.getByTestId("tools-breadcrumb");
    const icon = page.getByTestId("tools-breadcrumb-icon");
    const label = page.getByTestId("tools-breadcrumb-label");
    const back = page.getByTestId("tools-breadcrumb-back");

    await expect(crumb).toBeVisible({ timeout: 15_000 });
    await expect(label).toHaveText(/transaction history/i);
    await expect(back).toBeVisible();

    const iconBox = await icon.boundingBox();
    const labelBox = await label.boundingBox();
    const backBox = await back.boundingBox();
    expect(iconBox).toBeTruthy();
    expect(labelBox).toBeTruthy();
    expect(backBox).toBeTruthy();

    expect(boxesOverlap(iconBox!, labelBox!), "label must not cover the tool icon").toBe(false);
    expect(boxesOverlap(labelBox!, backBox!), "label must not cover Back to menu").toBe(false);
    expect(boxesOverlap(iconBox!, backBox!), "tool icon must not cover Back to menu").toBe(false);

    // Label should stay left of the back control (no overflow under it).
    expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(backBox!.x + 1);
  });
});
