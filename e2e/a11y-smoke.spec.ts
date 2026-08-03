import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * TRF-103 — axe accessibility smoke on public surfaces.
 * Serious/critical violations fail the job; moderate/minor are reported only.
 */
test.describe("a11y smoke (axe)", () => {
  for (const path of ["/demo", "/login", "/landing"] as const) {
    test(`${path} has no critical/serious axe violations`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(500);

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
