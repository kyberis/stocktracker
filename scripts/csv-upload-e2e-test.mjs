#!/usr/bin/env node
/**
 * E2E test: CSV upload feature at localhost:3003
 * Creates user testupload, uploads Simple CSV, verifies dashboard.
 */
import { chromium } from "playwright";
import { existsSync } from "fs";
import { join } from "path";

const BASE_URL = "http://localhost:3003";
const CSV_PATH = join(process.cwd(), "docs", "test_simple_upload.csv");
const USERNAME = "testupload";
const PASSWORD = "Test1234!";

async function tryUsername(browser, username) {
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/signup`);
  await page.waitForLoadState("networkidle");

  // Uncheck sample portfolio
  const checkbox = page.locator('input[type="checkbox"]');
  if (await checkbox.isChecked()) await checkbox.click();

  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('input[type="password"]').nth(1).fill(PASSWORD);
  await page.getByRole("button", { name: /Create account/i }).click();

  await page.waitForTimeout(3000);
  const url = page.url();
  const hasError = await page.getByText(/already exists|username taken/i).isVisible().catch(() => false);
  await page.close();
  if (hasError) return false;
  return !url.includes("/signup");
}

async function main() {
  const results = { steps: [], errors: [] };

  if (!existsSync(CSV_PATH)) {
    results.errors.push(`CSV file not found: ${CSV_PATH}`);
    console.log(JSON.stringify(results, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: !process.env.HEADED });

  try {
    // Step 1: Create user or use existing
    let username = null;
    for (let i = 0; i < 8; i++) {
      const attempt = i === 0 ? USERNAME : `${USERNAME}${i + 1}`;
      const ok = await tryUsername(browser, attempt);
      if (ok) {
        username = attempt;
        results.steps.push({
          step: 1,
          name: "Create user",
          status: "ok",
          detail: `Created ${attempt}`,
        });
        break;
      }
    }
    if (!username) {
      username = `${USERNAME}8`;
      results.steps.push({
        step: 1,
        name: "Create user",
        status: "skip",
        detail: "All usernames exist - using testupload8 (login only)",
      });
    }

    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.locator('input[autocomplete="username"]').fill(username);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: /Sign in|Sign In/i }).click();
    await page.waitForURL(/\/(?!login)/, { timeout: 20000 });
    await page.waitForTimeout(1000);
    const afterLoginUrl = page.url();
    if (afterLoginUrl.includes("change-password")) {
      await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
      await page.locator('input[autocomplete="new-password"]').first().fill(PASSWORD);
      await page.locator('input[autocomplete="new-password"]').nth(1).fill(PASSWORD);
      await page.getByRole("button", { name: /Update password/i }).click();
      await page.waitForURL(/\/(?!change-password)/, { timeout: 5000 });
    }
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Dismiss What's New modal (blocks Import Portfolio button)
    const gotIt = page.getByRole("button", { name: /Got it|Entendido/ });
    try {
      await gotIt.waitFor({ state: "visible", timeout: 8000 });
      await gotIt.click();
      await page.waitForTimeout(800);
    } catch {
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }
    }

    // Step 2: Verify empty dashboard
    const emptyMsg = page.getByText("No holdings yet");
    const emptyVisible = await emptyMsg.isVisible();
    if (emptyVisible) await page.screenshot({ path: "e2e-step2-empty-dashboard.png" });
    results.steps.push({
      step: 2,
      name: "Empty dashboard",
      status: emptyVisible ? "ok" : "unexpected",
      detail: emptyVisible ? "Shows 'No holdings yet'" : "No empty state message",
    });

    // Step 3: Open Import, select Simple CSV, upload
    const importPortfolioBtn = page.getByRole("button", { name: /Import Portfolio|Importar Portafolio/ });
    await importPortfolioBtn.waitFor({ state: "visible", timeout: 15000 });
    await importPortfolioBtn.click({ force: true });
    await page.waitForTimeout(300);

    const simpleCsvBtn = page.getByRole("button", { name: "Simple CSV" });
    await simpleCsvBtn.click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(CSV_PATH);

    // Wait for preview
    await page.waitForTimeout(2000);
    const importBtn = page.getByRole("button", { name: /Import All|Importar Todo/ });
    await importBtn.waitFor({ state: "visible", timeout: 15000 });
    await page.screenshot({ path: "e2e-step3-preview.png" });

    // Capture preview content
    const previewText = await page.locator('[class*="overflow"]').first().textContent().catch(() => "");
    const hasAapl = await page.getByText("AAPL").first().isVisible().catch(() => false);
    const hasGoogl = await page.getByText("GOOGL").first().isVisible().catch(() => false);

    results.steps.push({
      step: 3,
      name: "CSV preview",
      status: "ok",
      detail: `Preview shows AAPL: ${hasAapl}, GOOGL: ${hasGoogl}`,
    });

    await importBtn.click();

    // Wait for success
    const successMsg = page.getByText(/Successfully imported|posiciones importadas|transactions imported|transacciones importadas/i);
    await successMsg.waitFor({ state: "visible", timeout: 15000 });
    await page.screenshot({ path: "e2e-step3-success.png" });
    const successText = await successMsg.textContent();

    results.steps.push({
      step: 3,
      name: "Import success",
      status: "ok",
      detail: successText?.slice(0, 80) || "Success message shown",
    });

    // Close modal
    await page.getByRole("button", { name: "Close" }).click();
    await page.waitForTimeout(500);

    // Step 4: Verify dashboard
    const expectedTickers = ["AAPL", "GOOGL", "MSFT", "O", "VZ"];
    const found = [];
    for (const t of expectedTickers) {
      await page.waitForTimeout(200);
      const visible = await page.getByText(t, { exact: true }).first().isVisible().catch(() => false);
      if (visible) found.push(t);
    }

    results.steps.push({
      step: 4,
      name: "Dashboard holdings",
      status: found.length === expectedTickers.length ? "ok" : "partial",
      detail: `Expected: ${expectedTickers.join(", ")}. Found: ${found.join(", ") || "none"}`,
    });
    await page.screenshot({ path: "e2e-step4-dashboard.png" });

    if (found.length < expectedTickers.length) {
      results.errors.push(`Missing tickers: ${expectedTickers.filter((t) => !found.includes(t)).join(", ")}`);
    }

    await page.close();
  } catch (err) {
    results.errors.push(err.message || String(err));
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
  process.exit(results.errors.length > 0 ? 1 : 0);
}

main();
