/**
 * Central registry of all cron jobs.
 * When adding a new cron, register it here AND in vercel.json.
 */

export interface CronJob {
  /** Name used in withCronLogging() and the cron_runs table */
  name: string;
  /** API route path (must match vercel.json when not paused) */
  path: string;
  /** Cron schedule expression (must match vercel.json when not paused) */
  schedule: string;
  /** Human-readable description */
  description: string;
  /** When true, job is intentionally not scheduled in vercel.json */
  paused?: boolean;
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
    name: "commerce-complimentary-renewal",
    path: "/api/cron/commerce-complimentary-renewal",
    schedule: "0 2 * * *",
    description: "Renew 30-day complimentary Trefolio Pro while commerce_enabled is off",
  },
  {
    name: "weekly-digest",
    path: "/api/cron/weekly-digest",
    schedule: "0 8 * * 1",
    description: "Generate and send AI-powered weekly portfolio digest to Pro users every Monday",
  },
  {
    name: "portfolio-recommendations",
    path: "/api/cron/portfolio-recommendations",
    schedule: "0 7 * * 1",
    description: "Weekly portfolio tip analysis for active non-test users (last_active within 30d, ≥1 holding); cache Home recommendation queue",
  },
  {
    name: "digest-email",
    path: "/api/cron/digest-email",
    schedule: "*/15 * * * *",
    description: "PAUSED — market digests no longer processed (was: poll Gmail, AI rewrite, store drafts)",
    paused: true,
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
    name: "support-return-watch",
    path: "/api/cron/support-return-watch",
    schedule: "*/5 * * * *",
    description: "Alert ProdOps when a holdings-restore email recipient returns to the app",
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
  {
    name: "coverage-reconcile",
    path: "/api/cron/coverage-reconcile",
    schedule: "15 2 * * *",
    description: "Overnight scan: flag holdings that lost Yahoo/alias quote coverage (TRF-104)",
  },
  {
    name: "portfolio-anomaly-scan",
    path: "/api/cron/portfolio-anomaly-scan",
    schedule: "15 3 * * *",
    description:
      "Scan portfolios with ≥1 holding for data anomalies; persist findings, LLM explain, enqueue ProdOps alerts",
  },
  {
    name: "screening-recover",
    path: "/api/cron/screening-recover",
    schedule: "*/2 * * * *",
    description:
      "Investment screening: recover expired step leases, retry or fail exhausted attempts, kick the worker if pending steps remain",
  },
];
