/**
 * Screening observability (HLD §11). Entry-funnel counters ship with E0;
 * step histograms / QA counters land with later agent stages.
 */
import { Counter, Histogram } from "prom-client";
import { getMetricsRegistry, getOrCreateMetric } from "@/lib/metrics";

export const screeningEntryViewsTotal = getOrCreateMetric(
  "screening_entry_views_total",
  () =>
    new Counter({
      name: "screening_entry_views_total",
      help: "Investment screening entry page views",
      labelNames: ["variant", "preview"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningEntryCtaTotal = getOrCreateMetric(
  "screening_entry_cta_total",
  () =>
    new Counter({
      name: "screening_entry_cta_total",
      help: "Investment screening entry CTA clicks",
      labelNames: ["intent", "variant", "preview"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningDiscoveryOpenedTotal = getOrCreateMetric(
  "screening_discovery_opened_total",
  () =>
    new Counter({
      name: "screening_discovery_opened_total",
      help: "Clicks on screening discovery CTAs outside /screening",
      labelNames: ["source"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningEntryBackHomeTotal = getOrCreateMetric(
  "screening_entry_back_home_total",
  () =>
    new Counter({
      name: "screening_entry_back_home_total",
      help: "Back-home clicks from the screening entry page",
      labelNames: ["variant", "preview"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningIntakeTurnsTotal = getOrCreateMetric(
  "screening_intake_turns_total",
  () =>
    new Counter({
      name: "screening_intake_turns_total",
      help: "Investment screening intake agent turns by outcome",
      labelNames: ["status", "intent"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningIntakeLatencyMs = getOrCreateMetric(
  "screening_intake_latency_ms",
  () =>
    new Histogram({
      name: "screening_intake_latency_ms",
      help: "Latency of a screening intake agent turn in milliseconds",
      labelNames: ["status"] as const,
      buckets: [250, 500, 1000, 2000, 4000, 8000, 16000, 30000, 60000],
      registers: [getMetricsRegistry()],
    }),
);

export const screeningRunsCreatedTotal = getOrCreateMetric(
  "screening_runs_created_total",
  () =>
    new Counter({
      name: "screening_runs_created_total",
      help: "Screening runs persisted (mock or real pipeline)",
      labelNames: ["intent", "mocked"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export function recordScreeningIntakeTurn(
  status: string,
  intent: string,
  latencyMs: number,
): void {
  try {
    screeningIntakeTurnsTotal.inc({
      status: status || "unknown",
      intent: intent || "unknown",
    });
    screeningIntakeLatencyMs.observe({ status: status || "unknown" }, Math.max(0, latencyMs));
  } catch (err) {
    console.error(
      "Failed to record screening intake metric:",
      err instanceof Error ? err.message : err,
    );
  }
}

export function recordScreeningRunCreated(intent: string, mocked: boolean): void {
  try {
    screeningRunsCreatedTotal.inc({
      intent: intent || "unknown",
      mocked: mocked ? "true" : "false",
    });
  } catch (err) {
    console.error(
      "Failed to record screening run metric:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Pipeline-side metrics (HLD §11). Registered on demand so tests don't have to
 * import the whole runtime.
 */
export const screeningStepDurationMs = getOrCreateMetric(
  "screening_step_duration_ms",
  () =>
    new Histogram({
      name: "screening_step_duration_ms",
      help: "Duration of a screening pipeline step (single agent turn) in milliseconds",
      labelNames: ["agent_kind", "status"] as const,
      buckets: [500, 1000, 2000, 5000, 10_000, 20_000, 40_000, 60_000, 120_000],
      registers: [getMetricsRegistry()],
    }),
);

export const screeningStepFailuresTotal = getOrCreateMetric(
  "screening_step_failures_total",
  () =>
    new Counter({
      name: "screening_step_failures_total",
      help: "Screening pipeline step failures by agent and reason",
      labelNames: ["agent_kind", "reason"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningFmpRequestsTotal = getOrCreateMetric(
  "screening_fmp_requests_total",
  () =>
    new Counter({
      name: "screening_fmp_requests_total",
      help: "FMP screener requests issued by the Hard Data agent",
      labelNames: ["status"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningHardDataUniverseSize = getOrCreateMetric(
  "screening_hard_data_universe_size",
  () =>
    new Histogram({
      name: "screening_hard_data_universe_size",
      help: "Number of tickers returned by the FMP screener before ranking",
      buckets: [0, 5, 10, 20, 40, 80, 160, 320, 640, 1000],
      registers: [getMetricsRegistry()],
    }),
);

export function recordScreeningStep(opts: {
  agentKind: string;
  status: "done" | "failed" | "skipped";
  durationMs: number;
  reason?: string;
}): void {
  const agentKind = opts.agentKind || "unknown";
  try {
    screeningStepDurationMs.observe(
      { agent_kind: agentKind, status: opts.status },
      Math.max(0, opts.durationMs),
    );
    if (opts.status === "failed") {
      screeningStepFailuresTotal.inc({
        agent_kind: agentKind,
        reason: opts.reason?.slice(0, 40) || "unknown",
      });
    }
  } catch (err) {
    console.error(
      "Failed to record screening step metric:",
      err instanceof Error ? err.message : err,
    );
  }
}

export function recordFmpScreenerRequest(status: "ok" | "error" | "rate_limited"): void {
  try {
    screeningFmpRequestsTotal.inc({ status });
  } catch {
    // metrics are best-effort
  }
}

export function recordHardDataUniverseSize(size: number): void {
  try {
    screeningHardDataUniverseSize.observe(Math.max(0, size));
  } catch {
    // metrics are best-effort
  }
}

/* ── IR / Business (E4) ──────────────────────────────────────────────── */

export const screeningIrTickerDurationMs = getOrCreateMetric(
  "screening_ir_ticker_duration_ms",
  () =>
    new Histogram({
      name: "screening_ir_ticker_duration_ms",
      help: "Duration of one IR/Business per-ticker step in milliseconds",
      labelNames: ["outcome"] as const,
      buckets: [500, 1000, 2000, 5000, 10_000, 20_000, 40_000, 60_000, 120_000],
      registers: [getMetricsRegistry()],
    }),
);

export const screeningIrGapsTotal = getOrCreateMetric(
  "screening_ir_gaps_total",
  () =>
    new Counter({
      name: "screening_ir_gaps_total",
      help: "Gaps reported by the IR/Business agent",
      registers: [getMetricsRegistry()],
    }),
);

export const screeningIrContradictionsTotal = getOrCreateMetric(
  "screening_ir_contradictions_total",
  () =>
    new Counter({
      name: "screening_ir_contradictions_total",
      help: "IR outputs that mark contradictionWithHardData=true",
      registers: [getMetricsRegistry()],
    }),
);

export const screeningFmpIrRequestsTotal = getOrCreateMetric(
  "screening_fmp_ir_requests_total",
  () =>
    new Counter({
      name: "screening_fmp_ir_requests_total",
      help: "FMP IR data requests (transcript / news / insider)",
      labelNames: ["endpoint", "result"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export function recordIrTickerStep(
  outcome: "ok" | "error" | "empty",
  durationMs: number,
  opts?: { gaps?: number; contradiction?: boolean },
): void {
  try {
    screeningIrTickerDurationMs.observe(
      { outcome },
      Math.max(0, durationMs),
    );
    if (opts?.gaps && opts.gaps > 0) {
      screeningIrGapsTotal.inc(opts.gaps);
    }
    if (opts?.contradiction) {
      screeningIrContradictionsTotal.inc();
    }
  } catch {
    // metrics are best-effort
  }
}

export function recordFmpIrRequest(
  endpoint: "earning-call-transcript" | "news/stock" | "insider-trading/search",
  result: "ok" | "error" | "rate_limited" | "empty",
): void {
  try {
    screeningFmpIrRequestsTotal.inc({ endpoint, result });
  } catch {
    // metrics are best-effort
  }
}

function labelOrUnknown(value: string | undefined, fallback = "unknown"): string {
  return value && value.length > 0 ? value : fallback;
}

/**
 * Bump Prometheus counters for a persisted screening entry event.
 * Safe to call after trackEvent; never throws to the request path.
 */
export function recordScreeningEntryMetric(
  event: string,
  metadata?: Record<string, string>,
): void {
  try {
    const variant = labelOrUnknown(metadata?.variant);
    const preview = labelOrUnknown(metadata?.preview, "live");
    switch (event) {
      case "screening_entry_viewed":
        screeningEntryViewsTotal.inc({ variant, preview });
        break;
      case "screening_entry_cta_clicked":
        screeningEntryCtaTotal.inc({
          intent: labelOrUnknown(metadata?.intent),
          variant,
          preview,
        });
        break;
      case "screening_discovery_opened":
        screeningDiscoveryOpenedTotal.inc({
          source: labelOrUnknown(metadata?.source, "unknown"),
        });
        break;
      case "screening_entry_back_home":
        screeningEntryBackHomeTotal.inc({ variant, preview });
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(
      "Failed to record screening entry metric:",
      err instanceof Error ? err.message : err,
    );
  }
}
