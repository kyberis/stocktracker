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

    // Empty portfolio shows "Import Portfolio" link
    const importLink = page.getByRole("link", { name: /Import Portfolio/i });
    await expect(importLink).toBeVisible({ timeout: 10000 });

    // Navigate to Import page
    await importLink.click();
    await page.waitForURL(/\/import/, { timeout: 10000 });

    // Wizard step 1: Choose "Broker CSV" method
    await page.getByText("Broker CSV").first().click();

    // Wizard step 2: Choose "DEGIRO" broker and click Next
    await page.getByText("DEGIRO").first().click();
    await page.getByRole("button", { name: /Next|Siguiente/i }).click();

    // Wizard step 3: Upload zone now visible
    await expect(page.getByText(/Drag & drop a file here|drag/i)).toBeVisible({
      timeout: 10000,
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

    // Wait for done step — large CSVs may take a while to import all transactions
    await expect(
      page.getByText(/Successfully imported|posiciones importadas|transactions imported|transacciones importadas/)
    ).toBeVisible({ timeout: 60000 });

    // Navigate to dashboard via "View Portfolio" link
    await page.getByRole("link", { name: /View Portfolio|Ver Portafolio/i }).click();

    // Verify we land on the dashboard with holdings
    await expect(page.getByText(/Portfolio|portfolioValue/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("No holdings yet")).not.toBeVisible({ timeout: 5000 });
  });
});
