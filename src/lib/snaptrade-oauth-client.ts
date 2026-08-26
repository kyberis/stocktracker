/** Delay before re-fetching when SnapTrade triggers an async broker pull. */
export const SNAPTRADE_OAUTH_RETRY_DELAY_MS = 30_000;

const OAUTH_PENDING_KEY = "snaptrade_oauth_pending";

export function markSnapTradeOAuthPending(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(OAUTH_PENDING_KEY, "1");
  } catch {
    // private browsing or quota exceeded
  }
}

export function consumeSnapTradeOAuthPending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(OAUTH_PENDING_KEY) !== "1") return false;
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}
