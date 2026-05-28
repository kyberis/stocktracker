/**
 * Central registry of all cron jobs.
 * When adding a new cron, register it here AND in vercel.json.
 */

export interface CronJob {
  /** Name used in withCronLogging() and the cron_runs table */
  name: string;
  /** API route path (must match vercel.json) */
  path: string;
  /** Cron schedule expression (must match vercel.json) */
  schedule: string;
  /** Human-readable description */
  description: string;
}

export const CRON_REGISTRY: CronJob[] = [
  {
    name: "push-gauges",
    path: "/api/cron/push-gauges",
    schedule: "0 0 * * *",
    description: "Sync rate-limit counters, purge old analytics/chat, push metrics to Grafana",
  },
  {
    name: "check-alerts",
    path: "/api/cron/check-alerts",
    schedule: "*/15 * * * *",
    description: "Evaluate active price alerts and dispatch notifications when thresholds are hit",
  },
  {
    name: "snaptrade-cleanup",
    path: "/api/cron/snaptrade-cleanup",
    schedule: "30 23 * * *",
    description: "Delete pending/inactive SnapTrade connections and prune old logs",
  },
  {
    name: "snaptrade-sync",
    path: "/api/cron/snaptrade-sync",
    schedule: "0 * * * *",
    description: "Sync all active SnapTrade broker connections — transactions, holdings, cash",
  },
  {
    name: "event-sync",
    path: "/api/cron/event-sync",
    schedule: "0 6 * * *",
    description: "Fetch earnings (AV and/or FMP per flags), economic events, IPO, and splits from FMP",
  },
  {
    name: "screener-sync",
    path: "/api/cron/screener-sync",
    schedule: "0 3 * * *",
    description: "Refresh stock screener cache with latest Yahoo Finance quotes",
  },
  {
    name: "tax-rules-review",
    path: "/api/cron/tax-rules-review",
    schedule: "0 9 2 1 *",
    description: "Check NL/DE tax rules are current for the year, notify if review needed",
  },
  {
    name: "x-post",
    path: "/api/cron/x-post",
    schedule: "*/15 * * * *",
    description: "Publish scheduled X/Twitter posts via the X API (includes auto-generated market digest posts)",
  },
  {
    name: "refresh-holdings",
    path: "/api/cron/refresh-holdings",
    schedule: "*/15 * * * *",
    description: "Update holding valuations and FX rates from Yahoo Finance",
  },
  {
    name: "portfolio-snapshots",
    path: "/api/cron/portfolio-snapshots",
    schedule: "*/5 * * * *",
    description: "Compute and store portfolio value snapshots for all users (every 5 min for dense intraday charts)",
  },
  {
    name: "trial-invitations",
    path: "/api/cron/trial-invitations",
    schedule: "0 10 * * *",
    description: "Invite eligible free users to 7-day Pro trial after 1 week of activity",
  },
  {
    name: "trial-expiration",
    path: "/api/cron/trial-expiration",
    schedule: "0 * * * *",
    description: "Downgrade expired trial users to free and send expiration email",
  },
  {
    name: "weekly-digest",
    path: "/api/cron/weekly-digest",
    schedule: "0 8 * * 1",
    description: "Generate and send AI-powered weekly portfolio digest to Pro users every Monday",
  },
  {
    name: "digest-email",
    path: "/api/cron/digest-email",
    schedule: "*/15 * * * *",
    description: "Poll Gmail for new market digest emails, rewrite with AI, and store as drafts for admin review",
  },
  {
    name: "moat-sync",
    path: "/api/cron/moat-sync",
    schedule: "0 */4 * * *",
    description: "Evaluate stale/missing moat scores for screener-universe stocks using Alpha Vantage fundamentals",
  },
  {
    name: "compact-snapshots",
    path: "/api/cron/compact-snapshots",
    schedule: "0 4 * * *",
    description: "Compact old hourly portfolio snapshots into daily (and weekly) rows to bound storage",
  },
  {
    name: "feedback-pipeline",
    path: "/api/cron/feedback-pipeline",
    schedule: "*/15 * * * *",
    description: "Process queued user feedback into Linear issues via the feedback pipeline",
  },
  {
    name: "prodops-dispatch",
    path: "/api/cron/prodops-dispatch",
    schedule: "*/5 * * * *",
    description: "Dispatch queued staff ops notifications to the external ProdOps Telegram service",
  },
  {
    name: "aid-digest",
    path: "/api/cron/aid-digest",
    schedule: "0 */6 * * *",
    description: "Pre-warm AID news digest cache for aid_beta users (earnings + portfolio news summaries)",
  },
  {
    name: "aid-finpulse",
    path: "/api/cron/aid-finpulse",
    schedule: "*/30 * * * *",
    description: "Ingest FinPulse X influencer posts via Tavily for AID beta",
  },
];
