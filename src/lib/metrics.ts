import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from "prom-client";
import { CURRENT_VERSION } from "@/lib/release-notes";

const globalForMetrics = globalThis as typeof globalThis & {
  __metricsRegistry?: Registry;
  __metricsInitialized?: boolean;
};

function getRegistry(): Registry {
  if (!globalForMetrics.__metricsRegistry) {
    globalForMetrics.__metricsRegistry = new Registry();
    globalForMetrics.__metricsRegistry.setDefaultLabels({ app: "stocktracker" });
  }
  return globalForMetrics.__metricsRegistry;
}

function ensureDefaults() {
  if (globalForMetrics.__metricsInitialized) return;
  collectDefaultMetrics({ register: getRegistry(), prefix: "stocktracker_" });
  globalForMetrics.__metricsInitialized = true;
}

function getOrCreate<T>(name: string, factory: () => T): T {
  const registry = getRegistry();
  const existing = registry.getSingleMetric(name);
  if (existing) return existing as unknown as T;
  return factory();
}

/* ── HTTP Metrics ──────────────────────────────────────────── */

export const httpRequestsTotal = getOrCreate(
  "stocktracker_http_requests_total",
  () =>
    new Counter({
      name: "stocktracker_http_requests_total",
      help: "Total HTTP requests by route, method, and status code",
      labelNames: ["route", "method", "status_code"] as const,
      registers: [getRegistry()],
    })
);

export const httpRequestDuration = getOrCreate(
  "stocktracker_http_request_duration_seconds",
  () =>
    new Histogram({
      name: "stocktracker_http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["route", "method"] as const,
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [getRegistry()],
    })
);

/* ── External Provider Metrics ─────────────────────────────── */

export const providerRequestsTotal = getOrCreate(
  "stocktracker_provider_requests_total",
  () =>
    new Counter({
      name: "stocktracker_provider_requests_total",
      help: "External data provider requests",
      labelNames: ["provider", "operation", "status"] as const,
      registers: [getRegistry()],
    })
);

export const providerRequestDuration = getOrCreate(
  "stocktracker_provider_request_duration_seconds",
  () =>
    new Histogram({
      name: "stocktracker_provider_request_duration_seconds",
      help: "External data provider request duration in seconds",
      labelNames: ["provider", "operation"] as const,
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
      registers: [getRegistry()],
    })
);

/* ── Auth Metrics ──────────────────────────────────────────── */

export const authEventsTotal = getOrCreate(
  "stocktracker_auth_events_total",
  () =>
    new Counter({
      name: "stocktracker_auth_events_total",
      help: "Authentication events",
      labelNames: ["event"] as const,
      registers: [getRegistry()],
    })
);

/* ── Business Metrics ──────────────────────────────────────── */

export const holdingsOpsTotal = getOrCreate(
  "stocktracker_holdings_operations_total",
  () =>
    new Counter({
      name: "stocktracker_holdings_operations_total",
      help: "Holdings CRUD operations",
      labelNames: ["operation"] as const,
      registers: [getRegistry()],
    })
);

export const transactionsOpsTotal = getOrCreate(
  "stocktracker_transactions_operations_total",
  () =>
    new Counter({
      name: "stocktracker_transactions_operations_total",
      help: "Transaction operations",
      labelNames: ["operation"] as const,
      registers: [getRegistry()],
    })
);

export const portfolioImportsTotal = getOrCreate(
  "stocktracker_portfolio_imports_total",
  () =>
    new Counter({
      name: "stocktracker_portfolio_imports_total",
      help: "Portfolio import attempts",
      labelNames: ["source", "status"] as const,
      registers: [getRegistry()],
    })
);

export const aiCallsTotal = getOrCreate(
  "stocktracker_ai_calls_total",
  () =>
    new Counter({
      name: "stocktracker_ai_calls_total",
      help: "AI analysis calls",
      labelNames: ["status", "analysis_type"] as const,
      registers: [getRegistry()],
    })
);

export const aiRequestDuration = getOrCreate(
  "stocktracker_ai_request_duration_seconds",
  () =>
    new Histogram({
      name: "stocktracker_ai_request_duration_seconds",
      help: "AI analysis request duration in seconds",
      labelNames: ["analysis_type"] as const,
      buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
      registers: [getRegistry()],
    })
);

/* ── Billing Metrics ───────────────────────────────────────── */

export const billingEventsTotal = getOrCreate(
  "stocktracker_billing_events_total",
  () =>
    new Counter({
      name: "stocktracker_billing_events_total",
      help: "Billing and subscription events",
      labelNames: ["event"] as const,
      registers: [getRegistry()],
    })
);

/* ── Paywall Metrics ───────────────────────────────────────── */

export const paywallHitsTotal = getOrCreate(
  "stocktracker_paywall_hits_total",
  () =>
    new Counter({
      name: "stocktracker_paywall_hits_total",
      help: "Paywall hit events",
      labelNames: ["feature", "reason"] as const,
      registers: [getRegistry()],
    })
);

/* ── Rate Limit Metrics ───────────────────────────────────── */

export const rateLimitHitsTotal = getOrCreate(
  "stocktracker_rate_limit_hits_total",
  () =>
    new Counter({
      name: "stocktracker_rate_limit_hits_total",
      help: "Rate limit 429 responses",
      labelNames: ["provider"] as const,
      registers: [getRegistry()],
    })
);

export const proSubscribersCurrent = getOrCreate(
  "stocktracker_pro_subscribers_current",
  () =>
    new Gauge({
      name: "stocktracker_pro_subscribers_current",
      help: "Current number of Pro subscribers",
      registers: [getRegistry()],
    })
);

export const proCapacityMax = getOrCreate(
  "stocktracker_pro_capacity_max",
  () => {
    const g = new Gauge({
      name: "stocktracker_pro_capacity_max",
      help: "Maximum Pro subscribers allowed",
      registers: [getRegistry()],
    });
    // Set once from config — import inline to avoid circular deps at module level
    import("@/lib/platform-config").then(({ PLATFORM_LIMITS }) => {
      g.set(PLATFORM_LIMITS.MAX_PRO_SUBSCRIBERS);
    });
    return g;
  }
);

/* ── App Info Gauge ────────────────────────────────────────── */

export const appInfo = getOrCreate("stocktracker_app_info", () => {
  const g = new Gauge({
    name: "stocktracker_app_info",
    help: "Application version info",
    labelNames: ["version"] as const,
    registers: [getRegistry()],
  });
  g.set({ version: CURRENT_VERSION }, 1);
  return g;
});

/* ── DB-Derived Gauges (updated at scrape time) ────────────── */

export const usersTotal = getOrCreate(
  "stocktracker_users_total",
  () =>
    new Gauge({
      name: "stocktracker_users_total",
      help: "Total registered users by plan",
      labelNames: ["plan"] as const,
      registers: [getRegistry()],
    })
);

export const usersActive = getOrCreate(
  "stocktracker_users_active",
  () =>
    new Gauge({
      name: "stocktracker_users_active",
      help: "Active users by time window",
      labelNames: ["window"] as const,
      registers: [getRegistry()],
    })
);

export const dbHoldingsTotal = getOrCreate(
  "stocktracker_db_holdings_total",
  () =>
    new Gauge({
      name: "stocktracker_db_holdings_total",
      help: "Total holdings across all users",
      registers: [getRegistry()],
    })
);

export const dbTransactionsTotal = getOrCreate(
  "stocktracker_db_transactions_total",
  () =>
    new Gauge({
      name: "stocktracker_db_transactions_total",
      help: "Total transactions across all users",
      registers: [getRegistry()],
    })
);

export const eventsLast24h = getOrCreate(
  "stocktracker_events_last_24h",
  () =>
    new Gauge({
      name: "stocktracker_events_last_24h",
      help: "Analytics events in the last 24 hours by type",
      labelNames: ["event"] as const,
      registers: [getRegistry()],
    })
);

/* ── Collect DB Gauges ─────────────────────────────────────── */

let _lastDbCollect = 0;
const DB_COLLECT_MIN_INTERVAL_MS = 15_000;

export async function collectDbGauges(): Promise<void> {
  const now = Date.now();
  if (now - _lastDbCollect < DB_COLLECT_MIN_INTERVAL_MS) return;
  _lastDbCollect = now;

  try {
    const { getMetricsSnapshot } = await import("@/lib/db");
    const snap = await getMetricsSnapshot();

    usersTotal.set({ plan: "free" }, snap.freeUsers);
    usersTotal.set({ plan: "pro" }, snap.proUsers);
    proSubscribersCurrent.set(snap.proUsers);
    usersActive.set({ window: "7d" }, snap.activeUsers7d);
    usersActive.set({ window: "30d" }, snap.activeUsers30d);
    dbHoldingsTotal.set(snap.holdingsCount);
    dbTransactionsTotal.set(snap.transactionsCount);

    for (const { event, count } of snap.eventsLast24h) {
      eventsLast24h.set({ event }, count);
    }
  } catch (err) {
    console.error("Failed to collect DB gauges:", err instanceof Error ? err.message : err);
  }
}

/* ── Scrape Endpoint Helper ────────────────────────────────── */

export async function getMetricsOutput(): Promise<string> {
  ensureDefaults();
  await collectDbGauges();
  return getRegistry().metrics();
}

export function getContentType(): string {
  return getRegistry().contentType;
}
