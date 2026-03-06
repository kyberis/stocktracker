#!/usr/bin/env node
/**
 * Test Import Portfolio flow and capture screenshots during import.
 * Run: node scripts/test-import-with-screenshots.mjs
 * Requires: server at http://localhost:3000, admin user exists
 */
import { chromium } from "playwright";
import path from "path";

const CSV_PATH = process.env.CSV_PATH || "/Users/mcsuarez/stocktracker/docs/portfolio_sample_degiro.csv";
const BASE = "http://localhost:3000";
const SCREENSHOT_DIR = "/Users/mcsuarez/stocktracker";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  const results = { pass: false, messages: [], screenshots: [], errors: [] };

  try {
    // Login
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.locator('input[autocomplete="username"]').fill("admin");
    await page.locator('input[autocomplete="current-password"]').fill("admin");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/(?!login)/, { timeout: 8000 }).catch(() => {});

    if (page.url().includes("/change-password")) {
      await page.locator('input[name="currentPassword"]').fill("admin");
      await page.locator('input[name="newPassword"]').fill("Admin123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(?!change-password)/, { timeout: 5000 });
    }

    if (page.url().includes("/login")) {
      await page.locator('input[autocomplete="current-password"]').fill("Admin123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(?!login)/, { timeout: 5000 });
    }

    results.messages.push("Login: OK");

    // Go to dashboard
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      try {
        localStorage.setItem("trefolio_seen_version", "0.29.0");
      } catch {}
    });
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});

    // Dismiss overlays (What's New, upgrade modal, etc.)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
    // Click backdrop to close any modal
    const backdrop = page.locator('div.absolute.inset-0[class*="bg-black"]').first();
    if (await backdrop.isVisible().catch(() => false)) {
      await backdrop.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Open Import Portfolio
    await page.getByRole("button", { name: "Import Portfolio" }).click();
    await page.waitForSelector('input[type="file"]', { state: "visible" }).catch(() => {});
    const dropZone = page.getByText("Drag & drop a file here");
    await dropZone.waitFor({ state: "visible", timeout: 5000 });
    results.messages.push("Import modal: opened");

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(CSV_PATH);
    results.messages.push("File uploaded");

    // Wait for preview (Import All button) - large CSV may take 60-90s to parse
    const importAllBtn = page.getByRole("button", { name: /Import All|Importar Todo/ });
    try {
      await importAllBtn.waitFor({ state: "visible", timeout: 90000 });
    } catch (e) {
      const errPath = path.join(SCREENSHOT_DIR, "import-parse-timeout.png");
      await page.screenshot({ path: errPath });
      results.screenshots.push(errPath);
      const errText = await page.locator(".text-red-600, .text-red-400, [class*='error']").first().textContent().catch(() => "");
      results.errors.push(`Parse timeout. Page content: ${errText || "no error text"}`);
      throw e;
    }
    results.messages.push("Preview: ready");

    // Click Import All - start import
    const importStart = Date.now();
    await importAllBtn.click();

    // Wait for importing step to show (progress bar - text like "Importing transactions… X of Y")
    const progressText = page.getByText(/\d+ (of|de|van|z|od|af|\/) \d+|Importing transactions/);
    await progressText.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});

    // Take screenshot during import (progress bar visible)
    await page.waitForTimeout(800); // Let progress advance a bit
    const progressScreenshot = path.join(SCREENSHOT_DIR, "import-progress-during.png");
    await page.screenshot({ path: progressScreenshot });
    results.screenshots.push(progressScreenshot);
    results.messages.push(`Screenshot during import: ${progressScreenshot}`);

    // Wait for done
    const successText = page.getByText(/Successfully imported|posiciones importadas|transactions imported|transacciones importadas/);
    await successText.waitFor({ state: "visible", timeout: 60000 });
    const importDuration = ((Date.now() - importStart) / 1000).toFixed(1);
    results.messages.push(`Import completed in ${importDuration}s`);

    // Take screenshot when done
    const doneScreenshot = path.join(SCREENSHOT_DIR, "import-complete.png");
    await page.screenshot({ path: doneScreenshot });
    results.screenshots.push(doneScreenshot);
    results.messages.push(`Screenshot when done: ${doneScreenshot}`);

    const doneContent = await page.locator(".py-12").first().textContent().catch(() => "");
    results.messages.push(`Done message: ${doneContent?.slice(0, 150) || "success"}`);

    results.pass = true;
  } catch (err) {
    results.errors.push(err.message || String(err));
    // Try to capture error screenshot
    try {
      const errPath = path.join(SCREENSHOT_DIR, "import-error.png");
      await page.screenshot({ path: errPath });
      results.screenshots.push(errPath);
    } catch {}
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
  process.exit(results.pass ? 0 : 1);
}

main();
