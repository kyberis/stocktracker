/**
 * Company-analysis GET mixes anonymous (redacted Congress/insiders) and
 * authenticated (full) bodies on the same URL. Shared or browser caches that
 * ignore the session cookie would show a login wall to logged-in users.
 */
export const COMPANY_ANALYSIS_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
} as const;
