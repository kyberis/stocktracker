import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  /** Opt-in IdP browser flow (`e2e/idp-browser-smoke.spec.ts`); set `E2E_IDP_BROWSER=1` to collect it. */
  testIgnore: process.env.E2E_IDP_BROWSER === "1" ? [] : ["**/idp-browser-smoke.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "dot" : "list",
  timeout: process.env.CI ? 90_000 : 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // E2E=1: skip Redis auth rate limits + Turnstile for API signup/login (next start is production).
  // When using E2E_BASE_URL, start the app yourself with E2E=1 (e.g. E2E=1 npm start).
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // CI pre-builds in the workflow so Playwright only waits for `next start`.
        command: process.env.CI ? "npm start" : "npm run build && npm start",
        port: 3000,
        timeout: process.env.CI ? 60_000 : 120_000,
        reuseExistingServer: !process.env.CI,
        env: { E2E: "1" },
      },
});
