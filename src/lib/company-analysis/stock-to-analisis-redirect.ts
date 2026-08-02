/**
 * Build the canonical /analisis URL for legacy /stock/* deep links.
 * Keeps exchange / reportId query params and maps path segments to ?tab=.
 */
export function buildAnalisisRedirectHref(
  ticker: string,
  opts?: {
    exchange?: string;
    reportId?: string;
    tab?: "summary" | "details" | "intelligence" | "evaluation";
  },
): string {
  const q = new URLSearchParams();
  if (opts?.exchange) q.set("exchange", opts.exchange);
  if (opts?.reportId) q.set("reportId", opts.reportId);
  if (opts?.tab && opts.tab !== "summary") q.set("tab", opts.tab);
  const qs = q.toString();
  return `/analisis/${encodeURIComponent(ticker)}${qs ? `?${qs}` : ""}`;
}
