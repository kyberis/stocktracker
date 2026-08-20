import { METRIC_CATALOG } from "./catalog";
import type { Metric, ValidateContext } from "./types";

function sign(n: number): 1 | 0 | -1 {
  if (n > 0) return 1;
  if (n < 0) return -1;
  return 0;
}

function fail(metric: Metric, flag: string, ctx: ValidateContext): Metric {
  // Do not import screening/metrics here: this module is reachable from the
  // client report view. Telemetry is recorded on the hard-data path instead.
  console.warn("[thesis/metrics] rejected", {
    ticker: ctx.ticker ?? "unknown",
    metricId: metric.id,
    flag,
    rawValue: metric.value,
  });
  return {
    ...metric,
    status: "error",
    flags: [...metric.flags.filter((f) => f !== flag), flag],
  };
}

function daysBetween(isoA: string, isoB: string): number | null {
  const a = Date.parse(isoA);
  const b = Date.parse(isoB);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.abs(b - a) / 86_400_000;
}

const CYCLICAL =
  /energy|oil|gas|mining|metal|steel|chemical|airline|auto|semiconductor|paper|shipping|independent power|utilities|materials/i;

export function isCyclicalSector(
  sector?: string | null,
  industry?: string | null,
): boolean {
  return CYCLICAL.test(`${sector ?? ""} ${industry ?? ""}`);
}

function softFlags(metric: Metric, ctx: ValidateContext): string[] {
  const flags: string[] = [];
  const now = ctx.now ?? new Date().toISOString();
  if (metric.id === "targetUpside" && metric.value != null && metric.value > 40) {
    flags.push("stale_target");
  }
  if (metric.id === "targetUpside" && metric.period.asOf) {
    const age = daysBetween(metric.period.asOf, now);
    if (age != null && age > 45) flags.push("stale_target");
  }
  if (metric.id === "drawdown52w" && metric.value != null && metric.value < -25) {
    flags.push("major_drawdown");
  }
  if (
    metric.id === "netDebtToEbitda" &&
    ctx.previousTotalDebt != null &&
    ctx.currentTotalDebt != null &&
    ctx.previousTotalDebt > 0 &&
    ctx.currentTotalDebt > 1.3 * ctx.previousTotalDebt
  ) {
    flags.push("debt_event");
  }
  const filing = metric.source.filingDate;
  if (filing) {
    const age = daysBetween(filing, now);
    if (age != null && age > 120) flags.push("stale_filing");
  }
  if (
    metric.id === "netDebtToEbitda" &&
    metric.value != null &&
    metric.value > 4 &&
    isCyclicalSector(ctx.sector, ctx.industry)
  ) {
    flags.push("leveraged_cyclical");
  }
  return [...new Set(flags)];
}

/**
 * Hard rules H1–H5. Soft flags warn but still publish.
 * `null` values are valid (n/d) and do not fail.
 */
export function validateMetric(metric: Metric, ctx: ValidateContext = {}): Metric {
  const rule = METRIC_CATALOG[metric.id];
  if (!metric.unit || !metric.period?.label?.trim()) {
    return fail(metric, "missing_envelope", ctx);
  }
  if (metric.unit !== rule.unit) {
    return fail(metric, "unit_mismatch", ctx);
  }
  if (metric.value == null) {
    return { ...metric, status: "ok", flags: metric.flags };
  }
  if (!Number.isFinite(metric.value)) {
    return fail(metric, "not_finite", ctx);
  }
  if (metric.value < rule.min || metric.value > rule.max) {
    return fail(metric, "out_of_range", ctx);
  }
  if (
    metric.id === "interestCoverage" &&
    ctx.ebit != null &&
    Number.isFinite(ctx.ebit) &&
    sign(metric.value) !== sign(ctx.ebit)
  ) {
    return fail(metric, "h1_sign_mismatch", ctx);
  }
  const flags = [...metric.flags, ...softFlags(metric, ctx)];
  const unique = [...new Set(flags)];
  return {
    ...metric,
    status: unique.length > 0 ? "warn" : "ok",
    flags: unique,
  };
}

/** Value that copy and gates may use. Errors never leak a number. */
export function publishedMetricValue(metric: Metric): number | null {
  if (metric.status === "error") return null;
  return metric.value;
}
