#!/usr/bin/env node
/**
 * Takes screenshots of the StockTracker dashboard using Playwright.
 * Requires: curl login first to populate /tmp/stocktracker-cookies.txt
 * Run: node /tmp/take-screenshots.js
 */

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const COOKIES_FILE = "/tmp/stocktracker-cookies.txt";
const SCREENSHOTS_DIR = "/Users/mcsuarez/stocktracker/public/screenshots";

function extractSessionCookie() {
  const content = fs.readFileSync(COOKIES_FILE, "utf8");
  const lines = content.split("\n").filter((l) => l.trim() && l.includes("stocktracker_session"));
  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length >= 7 && parts[5] === "stocktracker_session") {
      return parts[6];
    }
  }
  throw new Error("stocktracker_session cookie not found in " + COOKIES_FILE);
}

async function main() {
  const sessionValue = extractSessionCookie();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  await context.addCookies([
    {
      name: "stocktracker_session",
      value: sessionValue,
      domain: "localhost",
      path: "/",
    },
  ]);

  const page = await context.newPage();

  const results = [];

  try {
    // Screenshot 1: Holdings table
    await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1000);
    const holdingsPath = path.join(SCREENSHOTS_DIR, "holdings-table.png");
    await page.screenshot({ path: holdingsPath });
    const holdingsStat = fs.statSync(holdingsPath);
    results.push({ name: "holdings-table.png", success: true, size: holdingsStat.size });

    // Screenshot 2: Dividends/performance section
    await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(1000);
    const dividendsPath = path.join(SCREENSHOTS_DIR, "dividends.png");
    await page.screenshot({ path: dividendsPath });
    const dividendsStat = fs.statSync(dividendsPath);
    results.push({ name: "dividends.png", success: true, size: dividendsStat.size });
  } catch (err) {
    console.error("Error:", err.message);
    results.push({ name: "holdings-table.png", success: false, error: err.message });
    results.push({ name: "dividends.png", success: false, error: err.message });
  } finally {
    await browser.close();
  }

  console.log("\n--- Screenshot results ---");
  for (const r of results) {
    if (r.success) {
      console.log("✓ " + r.name + ": success (" + (r.size / 1024).toFixed(2) + " KB)");
    } else {
      console.log("✗ " + r.name + ": failure - " + r.error);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
