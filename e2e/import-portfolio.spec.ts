import { test, expect } from "@playwright/test";
import { loginViaUI } from "./helpers";

const CSV_PATH = "/Users/mcsuarez/stocktracker/docs/portfolio_sample_degiro.csv";

test.describe("Import Portfolio", () => {
  test("login, import DEGIRO CSV, verify transactions and holdings", async ({
    page,
  }) => {
    test.setTimeout(60000);
    // Login via UI (admin/admin, fallback admin/Admin123!)
    await page.goto("/login");
    await page.locator('input[autocomplete="username"]').fill("admin");
    await page.locator('input[autocomplete="current-password"]').fill("admin");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(?!login)/, { timeout: 8000 }).catch(() => {});

    // Handle must-change-password flow
    if (page.url().includes("/change-password")) {
      await page.locator('input[name="currentPassword"]').fill("admin");
      await page.locator('input[name="newPassword"]').fill("Admin123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(?!change-password)/, { timeout: 5000 });
    }

    // If still on login, try Admin123!
    if (page.url().includes("/login")) {
      await page.locator('input[autocomplete="current-password"]').fill("Admin123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(?!login)/, { timeout: 5000 });
    }

    await page.goto("/");
    // Dismiss any overlay modal (What's New, upgrade, etc.) that blocks clicks
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
    await expect(page.getByRole("button", { name: "Import Portfolio" })).toBeVisible();

    // Open Import Portfolio modal
    await page.getByRole("button", { name: "Import Portfolio" }).click();
    await expect(page.getByText("Drag & drop a file here")).toBeVisible({
      timeout: 5000,
    });

    // Upload CSV via file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(CSV_PATH);

    // Wait for preview step (transactions extracted)
    await expect(
      page.getByRole("button", { name: /Import All|Importar Todo/ })
    ).toBeVisible({ timeout: 15000 });

    // Click Import All
    await page.getByRole("button", { name: /Import All|Importar Todo/ }).click();

    // Wait for done step
    await expect(
      page.getByText(/Successfully imported|posiciones importadas|transactions imported|transacciones importadas/)
    ).toBeVisible({ timeout: 15000 });

    // Click Close
    await page.getByRole("button", { name: "Close" }).click();

    // Verify holdings visible: no "No holdings yet", and stock names or count > 0
    await expect(page.getByText("No holdings yet")).not.toBeVisible();
    const stockNames = ["CONSTELLATION", "SILA", "BANK OF NOVA", "ESSENTIAL", "SIRIUS"];
    const found = await Promise.any(
      stockNames.map((name) =>
        page.getByText(new RegExp(name, "i")).first().isVisible()
      )
    ).catch(() => false);
    expect(found).toBeTruthy();
  });
});
