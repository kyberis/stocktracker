import { chromium } from "playwright";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE = "http://localhost:3000";
const OUT = join(__dirname, "..", "promo-screenshots");
const VP = { width: 1440, height: 900 };

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  const shot = (name) => page.screenshot({ path: join(OUT, name), type: "png" });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const go = (path) => page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 15000 });

  // ── 1. Login page ──
  await go("/login");
  await page.waitForSelector("button:has-text('Sign in')");
  await shot("01-login.png");
  console.log("✓ 01-login");

  // ── 2. Log in ──
  await page.fill('input[autocomplete="username"]', "admin");
  await page.fill('input[type="password"]', "admin123");
  await shot("02-login-filled.png");
  console.log("✓ 02-login-filled");

  await page.click("button:has-text('Sign in')");
  await page.waitForURL("**/", { timeout: 10000 });
  await wait(2500);
  await shot("03-dashboard-top.png");
  console.log("✓ 03-dashboard-top");

  // ── 3. Scroll to benchmark chart ──
  try {
    const chartHeading = page.locator("text=Portfolio vs Major Markets");
    await chartHeading.scrollIntoViewIfNeeded({ timeout: 3000 });
    await wait(500);
    await shot("04-benchmark-chart.png");
    console.log("✓ 04-benchmark-chart");
  } catch (e) { console.log("⚠ benchmark:", e.message.slice(0,60)); }

  // ── 4. Scroll to cash balances ──
  try {
    const cashHeading = page.locator("text=Cash Balances");
    await cashHeading.scrollIntoViewIfNeeded({ timeout: 3000 });
    await wait(500);
    await shot("05-cash-balances.png");
    console.log("✓ 05-cash-balances");
  } catch (e) { console.log("⚠ cash:", e.message.slice(0,60)); }

  // ── 5. Scroll to portfolio table bottom ──
  await page.evaluate(() => window.scrollTo(0, 99999));
  await wait(500);
  await shot("06-portfolio-bottom.png");
  console.log("✓ 06-portfolio-bottom");

  // ── 6. Back to top + light mode ──
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(300);

  try {
    const themeBtn = page.locator("button[title='Light mode'], button[title='Dark mode']").first();
    await themeBtn.click({ timeout: 3000 });
    await wait(500);
    await shot("07-dashboard-light.png");
    console.log("✓ 07-dashboard-light");
    await themeBtn.click({ timeout: 3000 });
    await wait(300);
  } catch (e) { console.log("⚠ light mode:", e.message.slice(0,60)); }

  // ── 7. Add Stock modal ──
  try {
    await page.click("button:has-text('Add Stock')", { timeout: 3000 });
    await wait(600);
    await shot("08-add-stock.png");
    console.log("✓ 08-add-stock");
    // Close by clicking backdrop
    await page.locator(".backdrop-blur-sm").first().click({ force: true, timeout: 2000 });
    await wait(500);
  } catch (e) { console.log("⚠ add-stock:", e.message.slice(0,60)); }

  // ── 8. Import Portfolio modal ──
  try {
    await page.click("button[title='Import Portfolio']", { timeout: 5000 });
    await wait(600);
    await shot("09-import-portfolio.png");
    console.log("✓ 09-import-portfolio");
    await page.locator(".backdrop-blur-sm").first().click({ force: true, timeout: 2000 });
    await wait(500);
  } catch (e) { console.log("⚠ import:", e.message.slice(0,60)); }

  // ── 9. Reset Portfolio modal ──
  try {
    await page.click("button[title='Reset Portfolio']", { timeout: 5000 });
    await wait(600);
    await shot("10-reset-portfolio.png");
    console.log("✓ 10-reset-portfolio");
    await page.locator("button:has-text('Cancel')").click({ timeout: 3000 });
    await wait(500);
  } catch (e) { console.log("⚠ reset:", e.message.slice(0,60)); }

  // ── 10. Settings modal ──
  try {
    await page.click("button[title='Settings']", { timeout: 5000 });
    await wait(600);
    await shot("11-settings.png");
    console.log("✓ 11-settings");
    await page.locator(".backdrop-blur-sm").first().click({ force: true, timeout: 2000 });
    await wait(500);
  } catch (e) { console.log("⚠ settings:", e.message.slice(0,60)); }

  // ── 11. Profile page ──
  try {
    await go("/profile");
    await wait(2500);
    await shot("12-profile.png");
    console.log("✓ 12-profile");
  } catch (e) { console.log("⚠ profile:", e.message.slice(0,80)); }

  // ── 12. Admin page ──
  try {
    await go("/admin");
    await wait(2500);
    await shot("13-admin.png");
    console.log("✓ 13-admin");
  } catch (e) { console.log("⚠ admin:", e.message.slice(0,80)); }

  // ── 13. Stock detail page ──
  await go("/");
  await wait(2000);
  try {
    const stockLink = page.locator("a[href*='/stock/']").first();
    await stockLink.click({ timeout: 5000 });
    await page.waitForURL("**/stock/**", { timeout: 10000 });
    await wait(3000);
    await shot("14-stock-detail.png");
    console.log("✓ 14-stock-detail");
    await page.evaluate(() => window.scrollTo(0, 600));
    await wait(500);
    await shot("15-stock-detail-scroll.png");
    console.log("✓ 15-stock-detail-scroll");
  } catch (e) { console.log("⚠ stock-detail:", e.message.slice(0,80)); }

  // ── 14. Intelligence page ──
  try {
    const intelLink = page.locator("a[href*='/intelligence/']").first();
    if ((await intelLink.count()) > 0) {
      await intelLink.click({ timeout: 5000 });
      await page.waitForURL("**/intelligence/**", { timeout: 10000 });
      await wait(3000);
      await shot("16-intelligence.png");
      console.log("✓ 16-intelligence");
    } else {
      console.log("⚠ no intelligence link found");
    }
  } catch (e) { console.log("⚠ intelligence:", e.message.slice(0,80)); }

  // ── 15. Economic indicators ──
  try {
    await go("/economic-indicators");
    await wait(3000);
    await shot("17-economic-indicators.png");
    console.log("✓ 17-economic-indicators");
  } catch (e) { console.log("⚠ economic:", e.message.slice(0,80)); }

  // ── 16. Full page dashboard ──
  try {
    await go("/");
    await wait(2000);
    await page.screenshot({ path: join(OUT, "18-dashboard-full.png"), type: "png", fullPage: true });
    console.log("✓ 18-dashboard-full");
  } catch (e) { console.log("⚠ full page:", e.message.slice(0,80)); }

  await browser.close();
  console.log("\nAll screenshots captured!");
}

main().catch(console.error);
