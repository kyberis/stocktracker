import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from "prom-client";
import { CURRENT_VERSION } from "@/lib/release-version";

const globalForMetrics = globalThis as typeof globalThis & {
  __metricsRegistry?: Registry;
  __metricsInitialized?: boolean;
};

export function getMetricsRegistry(): Registry {
  if (!globalForMetrics.__metricsRegistry) {
    globalForMetrics.__metricsRegistry = new Registry();
    globalForMetrics.__metricsRegistry.setDefaultLabels({ app: "trefolio" });
  }
  return globalForMetrics.__metricsRegistry;
}

function getRegistry(): Registry {
  return getMetricsRegistry();
}

function ensureDefaults() {
  if (globalForMetrics.__metricsInitialized) return;
  collectDefaultMetrics({ register: getRegistry(), prefix: "trefolio_" });
  globalForMetrics.__metricsInitialized = true;
}

/** Shared registry helper for domain metric modules (e.g. screening). */
export function getOrCreateMetric<T>(name: string, factory: () => T): T {
  ensureDefaults();
  const registry = getRegistry();
  const existing = registry.getSingleMetric(name);
  if (existing) return existing as unknown as T;
  return factory();
}

function getOrCreate<T>(name: string, factory: () => T): T {
  return getOrCreateMetric(name, factory);
}

/* ── HTTP Metrics ──────────────────────────────────────────── */

export const httpRequestsTotal = getOrCreate(
  "trefolio_http_requests_total",
  () =>
    new Counter({
      name: "trefolio_http_requests_total",
      help: "Total HTTP requests by route, method, and status code",
      labelNames: ["route", "method", "status_code"] as const,
      registers: [getRegistry()],
    })
);

export const httpRequestDuration = getOrCreate(
  "trefolio_http_request_duration_seconds",
  () =>
    new Histogram({
      name: "trefolio_http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["route", "method"] as const,
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [getRegistry()],
    })
);

/* ── External Provider Metrics ─────────────────────────────── */

export const providerRequestsTotal = getOrCreate(
  "trefolio_provider_requests_total",
  () =>
    new Counter({
      name: "trefolio_provider_requests_total",
      help: "External data provider requests",
      labelNames: ["provider", "operation", "status"] as const,
      registers: [getRegistry()],
    })
);

export const providerRequestDuration = getOrCreate(
  "trefolio_provider_request_duration_seconds",
  () =>
    new Histogram({
      name: "trefolio_provider_request_duration_seconds",
      help: "External data provider request duration in seconds",
      labelNames: ["provider", "operation"] as const,
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
      registers: [getRegistry()],
    })
);

/* ── Auth Metrics ──────────────────────────────────────────── */

export const authEventsTotal = getOrCreate(
  "trefolio_auth_events_total",
  () =>
    new Counter({
      name: "trefolio_auth_events_total",
      help: "Authentication events",
      labelNames: ["event"] as const,
      registers: [getRegistry()],
    })
);

/* ── Business Metrics ──────────────────────────────────────── */

export const holdingsOpsTotal = getOrCreate(
  "trefolio_holdings_operations_total",
  () =>
    new Counter({
      name: "trefolio_holdings_operations_total",
      help: "Holdings CRUD operations",
      labelNames: ["operation"] as const,
      registers: [getRegistry()],
    })
);

export const transactionsOpsTotal = getOrCreate(
  "trefolio_transactions_operations_total",
  () =>
    new Counter({
      name: "trefolio_transactions_operations_total",
      help: "Transaction operations",
      labelNames: ["operation"] as const,
      registers: [getRegistry()],
    })
);

export const portfolioImportsTotal = getOrCreate(
  "trefolio_portfolio_imports_total",
  () =>
    new Counter({
      name: "trefolio_portfolio_imports_total",
      help: "Portfolio import attempts",
      labelNames: ["source", "status"] as const,
      registers: [getRegistry()],
    })
);

export const aiCallsTotal = getOrCreate(
  "trefolio_ai_calls_total",
  () =>
    new Counter({
      name: "trefolio_ai_calls_total",
      help: "AI analysis calls",
      labelNames: ["status", "analysis_type"] as const,
      registers: [getRegistry()],
    })
);

export const aiRequestDuration = getOrCreate(
  "trefolio_ai_request_duration_seconds",
  () =>
    new Histogram({
      name: "trefolio_ai_request_duration_seconds",
      help: "AI analysis request duration in seconds",
      labelNames: ["analysis_type"] as const,
      buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
      registers: [getRegistry()],
    })
);

/* ── Billing Metrics ───────────────────────────────────────── */

export const billingEventsTotal = getOrCreate(
  "trefolio_billing_events_total",
  () =>
    new Counter({
      name: "trefolio_billing_events_total",
      help: "Billing and subscription events",
      labelNames: ["event"] as const,
      registers: [getRegistry()],
    })
);

/* ── Paywall Metrics ───────────────────────────────────────── */

export const paywallHitsTotal = getOrCreate(
  "trefolio_paywall_hits_total",
  () =>
    new Counter({
      name: "trefolio_paywall_hits_total",
      help: "Paywall hit events",
      labelNames: ["feature", "reason"] as const,
      registers: [getRegistry()],
    })
);

/* ── Device / Firmware Metrics ─────────────────────────────── */

export const deviceFirmwareChecks = getOrCreate(
  "trefolio_device_firmware_checks_total",
  () =>
    new Counter({
      name: "trefolio_device_firmware_checks_total",
      help: "Firmware update checks by current device version and board",
      labelNames: ["current_version", "board"] as const,
      registers: [getRegistry()],
    })
);

export const deviceApiCalls = getOrCreate(
  "trefolio_device_api_calls_total",
  () =>
    new Counter({
      name: "trefolio_device_api_calls_total",
      help: "Device API calls by firmware version and route",
      labelNames: ["fw_version", "route", "status"] as const,
      registers: [getRegistry()],
    })
);

export const deviceErrors = getOrCreate(
  "trefolio_device_errors_total",
  () =>
    new Counter({
      name: "trefolio_device_errors_total",
      help: "Device-reported errors by firmware version and error type",
      labelNames: ["fw_version", "error_type"] as const,
      registers: [getRegistry()],
    })
);

export const deviceHeartbeats = getOrCreate(
  "trefolio_device_heartbeats_total",
  () =>
    new Counter({
      name: "trefolio_device_heartbeats_total",
      help: "Device heartbeats by firmware version and status",
      labelNames: ["fw_version", "status"] as const,
      registers: [getRegistry()],
    })
);

/* ── Support Chat Metrics ─────────────────────────────────── */

export const supportChatTotal = getOrCreate(
  "trefolio_support_chat_total",
  () =>
    new Counter({
      name: "trefolio_support_chat_total",
      help: "Support chat messages processed",
      labelNames: ["status"] as const,
      registers: [getRegistry()],
    })
);

export const supportChatDuration = getOrCreate(
  "trefolio_support_chat_duration_seconds",
  () =>
    new Histogram({
      name: "trefolio_support_chat_duration_seconds",
      help: "Support chat response duration in seconds",
      buckets: [0.5, 1, 2, 5, 10, 20],
      registers: [getRegistry()],
    })
);

/* ── Rate Limit Metrics ───────────────────────────────────── */

export const rateLimitHitsTotal = getOrCreate(
  "trefolio_rate_limit_hits_total",
  () =>
    new Counter({
      name: "trefolio_rate_limit_hits_total",
      help: "Rate limit 429 responses",
      labelNames: ["provider"] as const,
      registers: [getRegistry()],
    })
);

export const proSubscribersCurrent = getOrCreate(
  "trefolio_pro_subscribers_current",
  () =>
    new Gauge({
      name: "trefolio_pro_subscribers_current",
      help: "Current number of Pro subscribers",
      registers: [getRegistry()],
    })
);

export const proCapacityMax = getOrCreate(
  "trefolio_pro_capacity_max",
  () => {
    const g = new Gauge({
      name: "trefolio_pro_capacity_max",
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

export const appInfo = getOrCreate("trefolio_app_info", () => {
  const g = new Gauge({
    name: "trefolio_app_info",
    help: "Application version info",
    labelNames: ["version"] as const,
    registers: [getRegistry()],
  });
  g.set({ version: CURRENT_VERSION }, 1);
  return g;
});

/* ── DB-Derived Gauges (updated at scrape time) ────────────── */

export const usersTotal = getOrCreate(
  "trefolio_users_total",
  () =>
    new Gauge({
      name: "trefolio_users_total",
      help: "Total registered users by plan",
      labelNames: ["plan"] as const,
      registers: [getRegistry()],
    })
);

export const usersActive = getOrCreate(
  "trefolio_users_active",
  () =>
    new Gauge({
      name: "trefolio_users_active",
      help: "Active users by time window",
      labelNames: ["window"] as const,
      registers: [getRegistry()],
    })
);

export const dbHoldingsTotal = getOrCreate(
  "trefolio_db_holdings_total",
  () =>
    new Gauge({
      name: "trefolio_db_holdings_total",
      help: "Total holdings across all users",
      registers: [getRegistry()],
    })
);

export const dbTransactionsTotal = getOrCreate(
  "trefolio_db_transactions_total",
  () =>
    new Gauge({
      name: "trefolio_db_transactions_total",
      help: "Total transactions across all users",
      registers: [getRegistry()],
    })
);

export const eventsLast24h = getOrCreate(
  "trefolio_events_last_24h",
  () =>
    new Gauge({
      name: "trefolio_events_last_24h",
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
    usersTotal.set({ plan: "basic" }, snap.basicUsers);
    usersTotal.set({ plan: "pro" }, snap.proUsers);
    usersTotal.set({ plan: "wealth" }, snap.wealthUsers);
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
