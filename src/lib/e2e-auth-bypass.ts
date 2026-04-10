/**
 * Playwright E2E runs `next start` with NODE_ENV=production, so dev-only skips do not apply.
 * When E2E=1, auth routes skip Redis signup/login rate limits and Turnstile accepts empty tokens.
 *
 * Never enable on Vercel production: if VERCEL_ENV=production, bypass is off even when E2E=1.
 */
export function isE2EAuthBypassActive(): boolean {
  if (process.env.E2E !== "1") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return true;
}
