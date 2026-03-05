#!/usr/bin/env node
/**
 * One-off script to test CSV import flow via Playwright.
 * Run: node scripts/test-csv-import.mjs
 */
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, "..", "docs", "test_simple_upload.csv");

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  const consoleLogs = [];
  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, text });
    console.log(`[${type}] ${text}`);
  });

  try {
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Click Import Portfolio
    await page.getByRole("button", { name: "Import Portfolio" }).click();
    await page.waitForTimeout(500);

    // Select Simple CSV
    await page.getByRole("button", { name: "Simple CSV" }).click();
    await page.waitForTimeout(300);

    // Set file on the hidden input
    const fileInput = page.locator('input[type="file"][accept*="csv"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for extracting spinner or preview (max 15s)
    await page.waitForSelector('[data-step="extracting"], [data-step="preview"], .text=Extracting, .text=Preview', {
      timeout: 15000,
    }).catch(() => null);

    // Wait a bit for UI to settle
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: path.join(__dirname, "..", "docs", "csv-import-result.png") });

    // Log final state
    const bodyText = await page.textContent("body");
    console.log("\n--- Page contains 'Extracting'?", bodyText?.includes("Extracting"));
    console.log("--- Page contains 'Preview'?", bodyText?.includes("Preview"));
    console.log("--- Page contains 'Import'?", bodyText?.includes("Import"));
    console.log("\n--- Console messages:", consoleLogs.length);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
