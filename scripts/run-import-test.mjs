#!/usr/bin/env node
/**
 * One-off script to test Import Portfolio flow via Playwright.
 * Run: node scripts/run-import-test.mjs
 * Requires: server at http://localhost:3000, admin user exists
 */
import { chromium } from "playwright";

const CSV_PATH = "/Users/mcsuarez/stocktracker/docs/portfolio_sample_degiro.csv";
const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  const results = { pass: false, messages: [], counts: {}, errors: [] };

  try {
    // Login
    await page.goto(`${BASE}/login`);
    await page.locator('input[autocomplete="username"]').fill("admin");
    await page.locator('input[autocomplete="current-password"]').fill("admin");
    await page.click('button[type="submit"]');
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

    // Prevent What's New modal from auto-showing (use same key as app)
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      try {
        localStorage.setItem("trefolio_seen_version", "0.29.0");
      } catch {}
    });
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});

    // Dismiss What's New modal - click "Got it" or backdrop
    const gotIt = page.getByRole("button", { name: "Got it" });
    if (await gotIt.isVisible().catch(() => false)) {
      await gotIt.click();
      await page.waitForTimeout(500);
    } else {
      const backdrop = page.locator('div.absolute.inset-0[class*="bg-black"]').first();
      if (await backdrop.isVisible().catch(() => false)) {
        await backdrop.click({ force: true });
        await page.waitForTimeout(500);
      }
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

    // Wait for extracting to finish - either preview or error
    await page.waitForTimeout(3000);
    const errorEl = page.getByText(/importDegiroFailed|Extraction failed|Network error|No data/i);
    const hasError = await errorEl.isVisible().catch(() => false);
    if (hasError) {
      results.errors.push("Import failed: " + (await errorEl.textContent()));
      throw new Error("Import failed");
    }

    // Wait for preview (Import All button) - large CSV parse + ISIN lookups can take 60-90s
    const importAllBtn = page.getByRole("button", { name: /Import All|Importar Todo/ });
    try {
      await importAllBtn.waitFor({ state: "visible", timeout: 120000 });
    } catch (e) {
      await page.screenshot({ path: "import-parse-timeout.png" });
      const bodyText = await page.locator("body").textContent();
      results.errors.push(`Parse timeout. Body snippet: ${bodyText?.slice(0, 500)}`);
      throw e;
    }
    const btnText = await importAllBtn.textContent();
    results.messages.push(`Preview: ${btnText?.trim() || "Import All (N)"}`);

    // Click Import All
    await importAllBtn.click();

    // Wait for done
    const successText = page.getByText(/Successfully imported|posiciones importadas|transactions imported|transacciones importadas/);
    await successText.waitFor({ state: "visible", timeout: 15000 });
    const doneContent = await page.locator(".py-12").first().textContent();
    results.messages.push(`Done: ${doneContent?.slice(0, 120) || "success"}`);

    // Extract counts from success message
    const importedMatch = doneContent?.match(/(\d+)\s*(holdings|posiciones|transactions|transacciones)/gi);
    if (importedMatch) results.counts.imported = importedMatch;

    // Close modal
    await page.getByRole("button", { name: "Close" }).click();

    // Verify holdings
    await page.waitForTimeout(500);
    const noHoldings = await page.getByText("No holdings yet").isVisible().catch(() => false);
    const stockNames = ["CONSTELLATION", "SILA", "BANK OF NOVA", "ESSENTIAL", "SIRIUS"];
    let found = false;
    for (const name of stockNames) {
      if (await page.getByText(new RegExp(name, "i")).first().isVisible().catch(() => false)) {
        found = true;
        break;
      }
    }

    if (!noHoldings && found) {
      results.pass = true;
      results.messages.push("Holdings visible: OK");
    } else {
      results.errors.push(`Holdings verification failed: noHoldings=${noHoldings}, found=${found}`);
    }

    const holdingsCount = await page.locator("text=Holdings").first().evaluate((el) => {
      const sib = el.nextElementSibling;
      return sib?.textContent?.trim() || "?";
    }).catch(() => "?");
    results.counts.holdings = holdingsCount;
  } catch (err) {
    results.errors.push(err.message || String(err));
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
  process.exit(results.pass ? 0 : 1);
}

main();
