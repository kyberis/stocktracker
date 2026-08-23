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
    description:
      "Refresh screener cache for holdings ∪ hot mega-caps (UI fills missing/stale symbols on demand)",
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
    name: "lifecycle-emails",
    path: "/api/cron/lifecycle-emails",
    schedule: "0 10 * * *",
    description:
      "Daily: trial invitations, welcome-no-stocks activation, and 14-day winback (legacy /api/cron/trial-invitations|lifecycle-activation|lifecycle-winback aliases remain)",
  },
  {
    name: "trial-expiration",
    path: "/api/cron/trial-expiration",
    schedule: "0 9 * * *",
    description:
      "Daily backup: downgrade expired trial users and send expiration email (primary path is check-on-login)",
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
    description:
      "Weekly prefetch of Home tip queues for users active in the last 7 days; Home computes the rest on cache miss",
  },
  {
    name: "digest-email",
    path: "/api/cron/digest-email",
    schedule: "*/15 * * * *",
    description:
      "ARCHIVED — market digest Gmail pipeline removed; stub is a no-op (was: poll Gmail, AI rewrite, store drafts)",
    paused: true,
  },
  {
    name: "moat-sync",
    path: "/api/cron/moat-sync",
    schedule: "0 5 * * *",
    description:
      "Daily evaluate stale/missing moat scores (7-day max age); ensure-moat fills on demand",
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
    schedule: "0 * * * *",
    description:
      "Hourly backup: process queued user feedback into Linear issues (kick-on-write from /api/feedback)",
  },
  {
    name: "prodops-dispatch",
    path: "/api/cron/prodops-dispatch",
    schedule: "0 * * * *",
    description:
      "Hourly backup: dispatch queued ProdOps Telegram events (kick-on-enqueue from product routes)",
  },
  {
    name: "support-return-watch",
    path: "/api/cron/support-return-watch",
    schedule: "0 * * * *",
    description:
      "Hourly backup: alert ProdOps when a holdings-restore email recipient returns (primary path is last-active event)",
  },
  {
    name: "aid-digest",
    path: "/api/cron/aid-digest",
    schedule: "0 8 * * *",
    description:
      "Daily pre-warm of AID news digest for aid_beta users; skips users whose 24h cache is still fresh",
  },
  {
    name: "aid-finpulse",
    path: "/api/cron/aid-finpulse",
    schedule: "0 */6 * * *",
    description:
      "Ingest FinPulse X posts via Tavily every 6h (24h TTL; on-read if cache empty/stale)",
  },
  {
    name: "coverage-reconcile",
    path: "/api/cron/coverage-reconcile",
    schedule: "15 2 * * 0",
    description:
      "Weekly backup: flag holdings without Yahoo/FIGI quote coverage (primary heal is refresh-holdings)",
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
    schedule: "*/5 * * * *",
    description:
      "Investment screening: recover expired step leases, retry or fail exhausted attempts, kick the worker if pending steps remain",
  },
];

export function getCronJob(name: string): CronJob | undefined {
  return CRON_REGISTRY.find((job) => job.name === name);
}
