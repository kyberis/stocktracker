/**
 * Display-number invariants (calculation + cross-source).
 *
 * Pure: takes numbers already computed for the UI. Never fetches, never throws.
 * Production callers report violations via analytics — they must not blank the UI.
 */

export const DISPLAY_INVARIANT_EVENT = "display_invariant_violation";

/** 1 cent in portfolio currency. */
export const ABS_EPS = 0.01;
/** 1 basis point = 0.01% relative. */
export const REL_BPS_EPS = 1;

export type DisplayInvariantCode =
  | "non_finite"
  | "gain_loss_identity"
  | "gain_loss_pct"
  | "day_change_trf003"
  | "invested_plus_cash"
  | "sleeves_sum_invested"
  | "day_change_dual_path"
  | "row_sum_holdings";

export interface DisplayInvariantViolation {
  code: DisplayInvariantCode;
  /** Relative error in basis points (1 bp = 0.01%). 0 when not applicable. */
  relErrorBps: number;
}

export interface DisplayInvariantResult {
  ok: boolean;
  violations: DisplayInvariantViolation[];
}

export interface DisplaySleeves {
  stock: number;
  etf: number;
  fund: number;
  crypto: number;
  fixed_return: number;
}

/**
 * Numbers about to be shown (or just computed for the same screen).
 * Omit optional fields to skip the corresponding check.
 */
export interface DisplaySnapshot {
  /** Net worth / total current (cash included). */
  current: number;
  cost: number;
  gainLoss: number;
  gainLossPercent: number;
  /** Invested assets only (excludes liquid cash). */
  invested: number;
  liquidCash: number;
  dayAbs?: number;
  dayPct?: number;
  /** `calculatePortfolioTotals().dayGainLossEUR` */
  totalsDayGainLoss?: number;
  /** `getDayChange().amount` when a second path is still computed */
  metricsDayGainLoss?: number;
  sleeves?: DisplaySleeves;
  /** Sum of per-holding current values when the table passes them. */
  holdingsRowSum?: number;
}

export function relErrorBps(a: number, b: number): number {
  const denom = Math.max(Math.abs(a), Math.abs(b), ABS_EPS);
  return (Math.abs(a - b) / denom) * 10_000;
}

export function valuesClose(a: number, b: number): boolean {
  if (Math.abs(a - b) <= ABS_EPS) return true;
  return relErrorBps(a, b) <= REL_BPS_EPS;
}

export function holdingBucket(count: number): "0" | "1-5" | "6-20" | "21+" {
  if (count <= 0) return "0";
  if (count <= 5) return "1-5";
  if (count <= 20) return "6-20";
  return "21+";
}

export function fingerprintViolations(violations: DisplayInvariantViolation[]): string {
  return [...new Set(violations.map((v) => v.code))].sort().join(",");
}

export function maxRelErrorBps(violations: DisplayInvariantViolation[]): number {
  if (violations.length === 0) return 0;
  return Math.round(Math.max(...violations.map((v) => v.relErrorBps)));
}

/** Privacy-safe metadata for `/api/analytics/track` (string values, no money). */
export function displayInvariantTelemetryMetadata(
  violations: DisplayInvariantViolation[],
  surface: string,
  holdingCount: number,
): Record<string, string> {
  const codes = fingerprintViolations(violations).slice(0, 128);
  return {
    codes,
    max_bps: String(maxRelErrorBps(violations)),
    surface: surface.slice(0, 32),
    holding_bucket: holdingBucket(holdingCount),
  };
}

function collectNumbers(snapshot: DisplaySnapshot): number[] {
  const nums: number[] = [
    snapshot.current,
    snapshot.cost,
    snapshot.gainLoss,
    snapshot.gainLossPercent,
    snapshot.invested,
    snapshot.liquidCash,
  ];
  if (snapshot.dayAbs != null) nums.push(snapshot.dayAbs);
  if (snapshot.dayPct != null) nums.push(snapshot.dayPct);
  if (snapshot.totalsDayGainLoss != null) nums.push(snapshot.totalsDayGainLoss);
  if (snapshot.metricsDayGainLoss != null) nums.push(snapshot.metricsDayGainLoss);
  if (snapshot.holdingsRowSum != null) nums.push(snapshot.holdingsRowSum);
  if (snapshot.sleeves) {
    nums.push(
      snapshot.sleeves.stock,
      snapshot.sleeves.etf,
      snapshot.sleeves.fund,
      snapshot.sleeves.crypto,
      snapshot.sleeves.fixed_return,
    );
  }
  return nums;
}

function push(
  violations: DisplayInvariantViolation[],
  code: DisplayInvariantCode,
  a: number,
  b: number,
): void {
  violations.push({ code, relErrorBps: relErrorBps(a, b) });
}

function runChecks(snapshot: DisplaySnapshot): DisplayInvariantResult {
  const violations: DisplayInvariantViolation[] = [];

  if (collectNumbers(snapshot).some((n) => !Number.isFinite(n))) {
    violations.push({ code: "non_finite", relErrorBps: 0 });
    return { ok: false, violations };
  }

  const expectedGain = snapshot.current - snapshot.cost;
  if (!valuesClose(snapshot.gainLoss, expectedGain)) {
    push(violations, "gain_loss_identity", snapshot.gainLoss, expectedGain);
  }

  if (snapshot.cost > ABS_EPS) {
    const expectedPct = (snapshot.gainLoss / snapshot.cost) * 100;
    if (!valuesClose(snapshot.gainLossPercent, expectedPct)) {
      push(violations, "gain_loss_pct", snapshot.gainLossPercent, expectedPct);
    }
  }

  const net = snapshot.invested + snapshot.liquidCash;
  if (!valuesClose(net, snapshot.current)) {
    push(violations, "invested_plus_cash", net, snapshot.current);
  }

  if (snapshot.dayAbs != null && snapshot.dayPct != null) {
    const prior = snapshot.invested - snapshot.dayAbs;
    if (prior > ABS_EPS) {
      const impliedPct = (snapshot.dayAbs / prior) * 100;
      if (!valuesClose(snapshot.dayPct, impliedPct)) {
        push(violations, "day_change_trf003", snapshot.dayPct, impliedPct);
      }
    }
  }

  if (snapshot.sleeves) {
    const sleeveSum =
      snapshot.sleeves.stock +
      snapshot.sleeves.etf +
      snapshot.sleeves.fund +
      snapshot.sleeves.crypto +
      snapshot.sleeves.fixed_return;
    if (!valuesClose(sleeveSum, snapshot.invested)) {
      push(violations, "sleeves_sum_invested", sleeveSum, snapshot.invested);
    }
  }

  if (snapshot.totalsDayGainLoss != null && snapshot.metricsDayGainLoss != null) {
    if (!valuesClose(snapshot.totalsDayGainLoss, snapshot.metricsDayGainLoss)) {
      push(violations, "day_change_dual_path", snapshot.totalsDayGainLoss, snapshot.metricsDayGainLoss);
    }
  }

  if (snapshot.holdingsRowSum != null) {
    if (!valuesClose(snapshot.holdingsRowSum, snapshot.invested)) {
      push(violations, "row_sum_holdings", snapshot.holdingsRowSum, snapshot.invested);
    }
  }

  return { ok: violations.length === 0, violations };
}

export function assertDisplayInvariants(snapshot: DisplaySnapshot): DisplayInvariantResult {
  try {
    return runChecks(snapshot);
  } catch {
    return { ok: false, violations: [{ code: "non_finite", relErrorBps: 0 }] };
  }
}
