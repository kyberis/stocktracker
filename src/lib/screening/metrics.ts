/**
 * Screening observability (HLD §11). Entry-funnel, pipeline step, FMP/IR/Web,
 * and QA round counters.
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

export const screeningThesisMetricRejectedTotal = getOrCreateMetric(
  "screening_thesis_metric_rejected_total",
  () =>
    new Counter({
      name: "screening_thesis_metric_rejected_total",
      help: "Thesis metric envelopes rejected by hard validation (H1–H5)",
      labelNames: ["metric_id", "flag"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export function recordThesisMetricRejected(opts: {
  ticker: string;
  metricId: string;
  flag: string;
  rawValue: number | null;
}): void {
  try {
    screeningThesisMetricRejectedTotal.inc({
      metric_id: opts.metricId || "unknown",
      flag: opts.flag || "unknown",
    });
  } catch {
    // metrics are best-effort
  }
  console.warn("[thesis/metrics] rejected", {
    ticker: opts.ticker,
    metricId: opts.metricId,
    flag: opts.flag,
    rawValue: opts.rawValue,
  });
}

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

/* ── Web / Portfolio Context / Risk (E5–E7) ───────────────────────────── */

export const screeningTavilyRequestsTotal = getOrCreateMetric(
  "screening_tavily_requests_total",
  () =>
    new Counter({
      name: "screening_tavily_requests_total",
      help: "Tavily search requests issued by the Web & Sentiment agent",
      labelNames: ["status"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningTavilyResearchRequestsTotal = getOrCreateMetric(
  "screening_tavily_research_requests_total",
  () =>
    new Counter({
      name: "screening_tavily_research_requests_total",
      help: "Tavily Research API requests for screening company diligence",
      labelNames: ["status"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningTavilyExtractRequestsTotal = getOrCreateMetric(
  "screening_tavily_extract_requests_total",
  () =>
    new Counter({
      name: "screening_tavily_extract_requests_total",
      help: "Tavily Extract API requests for screening IR document processing",
      labelNames: ["status"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningCostBudgetExceededTotal = getOrCreateMetric(
  "screening_cost_budget_exceeded_total",
  () =>
    new Counter({
      name: "screening_cost_budget_exceeded_total",
      help: "Screening runs whose variable cost exceeded SCREENING_COST_BUDGET_USD",
      registers: [getMetricsRegistry()],
    }),
);

export function recordTavilyResearchRequest(
  status:
    | "ok"
    | "error"
    | "rate_limited"
    | "missing_key"
    | "timeout"
    | "bad_shape"
    | "unauthorized"
    | "empty",
): void {
  try {
    screeningTavilyResearchRequestsTotal.inc({ status });
  } catch {
    // metrics are best-effort
  }
}

export function recordTavilyExtractRequest(
  status:
    | "ok"
    | "error"
    | "rate_limited"
    | "missing_key"
    | "bad_shape"
    | "unauthorized"
    | "empty",
): void {
  try {
    screeningTavilyExtractRequestsTotal.inc({ status });
  } catch {
    // metrics are best-effort
  }
}

export function recordScreeningCostBudgetExceeded(totalUsd: number): void {
  try {
    screeningCostBudgetExceededTotal.inc();
    console.warn(
      `[screening/cost] budget exceeded: $${totalUsd.toFixed(4)} > budget`,
    );
  } catch {
    // metrics are best-effort
  }
}

export const screeningWebTickerDurationMs = getOrCreateMetric(
  "screening_web_ticker_duration_ms",
  () =>
    new Histogram({
      name: "screening_web_ticker_duration_ms",
      help: "Duration of one Web & Sentiment per-ticker step in milliseconds",
      labelNames: ["outcome"] as const,
      buckets: [500, 1000, 2000, 5000, 10_000, 20_000, 40_000, 60_000, 120_000],
      registers: [getMetricsRegistry()],
    }),
);

export const screeningWebUnconfirmedTotal = getOrCreateMetric(
  "screening_web_unconfirmed_total",
  () =>
    new Counter({
      name: "screening_web_unconfirmed_total",
      help: "Web signals labeled single_source_unconfirmed",
      registers: [getMetricsRegistry()],
    }),
);

export const screeningWebSignalsTotal = getOrCreateMetric(
  "screening_web_signals_total",
  () =>
    new Counter({
      name: "screening_web_signals_total",
      help: "Web signals by kind",
      labelNames: ["kind"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningPortfolioContextDurationMs = getOrCreateMetric(
  "screening_portfolio_context_duration_ms",
  () =>
    new Histogram({
      name: "screening_portfolio_context_duration_ms",
      help: "Duration of the Portfolio Context agent step",
      buckets: [500, 1000, 2000, 5000, 10_000, 20_000, 40_000, 60_000],
      registers: [getMetricsRegistry()],
    }),
);

export const screeningTopupTotal = getOrCreateMetric(
  "screening_topup_total",
  () =>
    new Counter({
      name: "screening_topup_total",
      help: "Portfolio Context positionKind counts",
      labelNames: ["kind"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningRiskDurationMs = getOrCreateMetric(
  "screening_risk_duration_ms",
  () =>
    new Histogram({
      name: "screening_risk_duration_ms",
      help: "Duration of the Risk & Suitability agent step",
      buckets: [500, 1000, 2000, 5000, 10_000, 20_000, 40_000, 60_000],
      registers: [getMetricsRegistry()],
    }),
);

export const screeningRiskSuitabilityTotal = getOrCreateMetric(
  "screening_risk_suitability_total",
  () =>
    new Counter({
      name: "screening_risk_suitability_total",
      help: "Risk agent suitability distribution",
      labelNames: ["suitability"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export function recordTavilyScreeningRequest(
  status: "ok" | "error" | "rate_limited" | "empty",
): void {
  try {
    screeningTavilyRequestsTotal.inc({ status });
  } catch {
    // metrics are best-effort
  }
}

export function recordWebTickerStep(
  outcome: "ok" | "error" | "empty",
  durationMs: number,
  opts?: { unconfirmed?: number; signalsByKind?: Record<string, number> },
): void {
  try {
    screeningWebTickerDurationMs.observe(
      { outcome },
      Math.max(0, durationMs),
    );
    if (opts?.unconfirmed && opts.unconfirmed > 0) {
      screeningWebUnconfirmedTotal.inc(opts.unconfirmed);
    }
    if (opts?.signalsByKind) {
      for (const [kind, count] of Object.entries(opts.signalsByKind)) {
        if (count > 0) screeningWebSignalsTotal.inc({ kind }, count);
      }
    }
  } catch {
    // metrics are best-effort
  }
}

export function recordPortfolioContextStep(
  durationMs: number,
  perCandidate: Array<{ positionKind: string }>,
): void {
  try {
    screeningPortfolioContextDurationMs.observe(Math.max(0, durationMs));
    for (const c of perCandidate) {
      screeningTopupTotal.inc({
        kind: c.positionKind === "top_up_existing" ? "top_up" : "new",
      });
    }
  } catch {
    // metrics are best-effort
  }
}

export function recordRiskStep(
  durationMs: number,
  perCandidate: Array<{ suitability: string }>,
): void {
  try {
    screeningRiskDurationMs.observe(Math.max(0, durationMs));
    for (const c of perCandidate) {
      screeningRiskSuitabilityTotal.inc({
        suitability: c.suitability || "unknown",
      });
    }
  } catch {
    // metrics are best-effort
  }
}

/* ── QA (Agent 6) ─────────────────────────────────────────────────────── */

export const screeningQaRoundsTotal = getOrCreateMetric(
  "screening_qa_rounds_total",
  () =>
    new Counter({
      name: "screening_qa_rounds_total",
      help: "QA verification rounds by verdict",
      labelNames: ["verdict"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export const screeningQaIssuesTotal = getOrCreateMetric(
  "screening_qa_issues_total",
  () =>
    new Counter({
      name: "screening_qa_issues_total",
      help: "QA issues by type and rule",
      labelNames: ["issue_type", "rule_id"] as const,
      registers: [getMetricsRegistry()],
    }),
);

export function recordQaRound(opts: {
  verdict: string;
  issues?: Array<{ issueType?: string | null; ruleId?: string | null }>;
}): void {
  try {
    screeningQaRoundsTotal.inc({
      verdict: opts.verdict || "unknown",
    });
    for (const issue of opts.issues ?? []) {
      screeningQaIssuesTotal.inc({
        issue_type: issue.issueType || "unknown",
        rule_id: issue.ruleId || "none",
      });
    }
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
