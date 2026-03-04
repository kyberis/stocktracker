#!/usr/bin/env node
/**
 * Records a screen recording of the CSV upload flow for StockTracker.
 * Saves video to public/videos/how-to-upload.webm
 */
import { chromium } from "playwright";
import { existsSync } from "fs";
import { join } from "path";

const BASE_URL = "http://localhost:3003";
const CSV_PATH = join(process.cwd(), "docs", "test_simple_upload.csv");
const VIDEO_PATH = join(process.cwd(), "public", "videos", "how-to-upload.webm");
const USERNAME = "testupload";
const PASSWORD = "Test1234!";

async function main() {
  if (!existsSync(CSV_PATH)) {
    console.error(`CSV file not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false,
    args: ["--window-size=1280,800"],
  });

  const context = await browser.newContext({
    recordVideo: { dir: join(process.cwd(), "public", "videos") },
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  try {
    // 1. Navigate to login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    // 2. Log in
    await page.locator('input[autocomplete="username"]').fill(USERNAME);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: /Sign in|Sign In/i }).click();
    await page.waitForURL(/\/(?!login)/, { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 3. Dismiss What's New modal if present
    const gotIt = page.getByRole("button", { name: /Got it|Entendido/ });
    if (await gotIt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gotIt.click();
      await page.waitForTimeout(500);
    }

    // 4. Wait 2 seconds for dashboard to load
    await page.waitForTimeout(2000);

    // 5. Click Import Portfolio button
    await page.getByRole("button", { name: /Import Portfolio|Importar Portafolio/ }).click();

    // 6. Wait 1 second
    await page.waitForTimeout(1000);

    // 7. Click Simple CSV tab
    await page.getByRole("button", { name: "Simple CSV" }).click();

    // 8. Wait 1 second for instructions to update
    await page.waitForTimeout(1000);

    // 9. Upload CSV file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(CSV_PATH);

    // 10. Wait 2 seconds for preview to load
    await page.waitForTimeout(2000);

    // 11. Take screenshot of preview
    await page.screenshot({ path: join(process.cwd(), "public", "videos", "upload-preview.png") });

    // 12. Click Import All
    await page.getByRole("button", { name: /Import All|Importar Todo/ }).click();

    // 13. Wait 2 seconds for import to complete
    await page.waitForTimeout(2000);

    // 14. Take screenshot of success state
    await page.screenshot({ path: join(process.cwd(), "public", "videos", "upload-success.png") });

    // 15. Close the modal
    await page.getByRole("button", { name: "Close" }).click();

    // 16. Wait 2 seconds
    await page.waitForTimeout(2000);

    // 17. Take screenshot of dashboard with holdings
    await page.screenshot({ path: join(process.cwd(), "public", "videos", "upload-dashboard.png") });

    console.log("All steps completed successfully.");
  } catch (err) {
    console.error("Error during recording:", err.message);
    throw err;
  } finally {
    const video = page.video();
    if (video) await video.saveAs(VIDEO_PATH);
    await context.close();
    console.log(`Video saved to: ${VIDEO_PATH}`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
