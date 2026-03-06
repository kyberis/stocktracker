import { test, expect } from "@playwright/test";
import { createTestUser, ensureLoggedOut, loginViaUI, dismissOverlays } from "./helpers";

const CSV_PATH = "/Users/mcsuarez/stocktracker/docs/portfolio_sample_degiro.csv";

test.describe("Import Portfolio", () => {
  test("login, import DEGIRO CSV, verify transactions and holdings", async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);

    await ensureLoggedOut(request);
    const creds = await createTestUser(request);
    await loginViaUI(page, creds.email, creds.password);

    await dismissOverlays(page);

    await expect(page.getByRole("button", { name: "Import Portfolio" })).toBeVisible({ timeout: 10000 });

    // Open Import Portfolio modal
    await page.getByRole("button", { name: "Import Portfolio" }).click();
    await expect(page.getByText(/Drag & drop a file here|drag/i)).toBeVisible({
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

    // Verify holdings appeared after import
    await page.waitForTimeout(2000);
    await expect(page.getByText("No holdings yet")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/\d+ holdings/)).toBeVisible({ timeout: 5000 });
  });
});
