import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * TRF-103 — axe accessibility smoke on stable public surfaces.
 * Serious/critical violations fail the job; moderate/minor are reported only.
 */
test.describe("a11y smoke (axe)", () => {
  // Prefer static/legal pages that do not depend on market data or auth bridges.
  for (const path of ["/privacy", "/terms", "/about"] as const) {
    test(`${path} has no critical/serious axe violations`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "load", timeout: 60_000 });
      expect(res?.ok() ?? false, `GET ${path} should be 2xx`).toBeTruthy();

      await expect(page.locator("html")).not.toHaveAttribute("id", "__next_error__", {
        timeout: 15_000,
      });
      await expect(page).toHaveTitle(/.+/);
      await expect(page.locator("body")).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const blockers = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      expect(
        blockers,
        blockers.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join("\n") || "ok",
      ).toEqual([]);
    });
  }
});
