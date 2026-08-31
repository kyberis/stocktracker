/**
 * Attractiveness checklist for single-company (and shortlist) valuation.
 * Eight scored checks: data → meaning → interpretation → pass/fail/unknown/skipped.
 */

export const ATTRACTIVENESS_CHECK_IDS = [
  "pe_vs_history",
  "eps_growth",
  "margin_trend",
  "graham_rule",
  "balance_sheet",
  "moat",
  "capital_allocation",
  "price_to_book",
] as const;

export type AttractivenessCheckId = (typeof ATTRACTIVENESS_CHECK_IDS)[number];

export type AttractivenessStatus = "pass" | "fail" | "unknown" | "skipped";

export interface AttractivenessCheckResult {
  id: AttractivenessCheckId;
  /** Stable numeric id for UI / checklist cards (1–8). */
  numericId: number;
  status: AttractivenessStatus;
  /** Machine-readable snapshot for scoring / prompts. */
  data: Record<string, number | string | boolean | null>;
  note?: string;
}

export interface AttractivenessInputs {
  peCurrent: number | null;
  histPeAvg: number | null;
  peerPe: number | null;
  /** EPS CAGR as percent points (e.g. 12 = 12%). */
  epsCagrPct: number | null;
  /** Operating margin change in pp over the window (latest − oldest). */
  opMarginDeltaPp: number | null;
  /** Net margin change in pp over the window. */
  netMarginDeltaPp: number | null;
  /** Years of margin observations used. */
  marginYears: number | null;
  ndEbitda: number | null;
  netCash: boolean | null;
  interestCoverage: number | null;
  moatScorePct: number | null;
  /** Diluted share-count CAGR as percent points (negative = buyback). */
  shareCountCagrPct: number | null;
  buyback: boolean | null;
  severeDilution: boolean | null;
  priceToBook: number | null;
  sector: string | null;
  industry: string | null;
}

export interface AttractivenessScore {
  checks: AttractivenessCheckResult[];
  passedIds: number[];
  failedIds: number[];
  /** 0–100 from scored (non-skipped) checks. */
  total: number | null;
  coveragePct: number;
}

/** Graham fair P/E: 8.5 + 2×g, g = expected growth % points. */
export function grahamFairPe(growthPct: number | null): number | null {
  if (growthPct == null || !Number.isFinite(growthPct)) return null;
  if (growthPct < -5 || growthPct > 40) return null;
  return 8.5 + 2 * growthPct;
}

/** P/B applies to financials, conglomerates, and asset-heavy businesses. */
export function priceToBookApplies(
  sector: string | null,
  industry: string | null,
): boolean {
  const hay = `${sector ?? ""} ${industry ?? ""}`.toLowerCase();
  if (!hay.trim()) return false;
  return (
    /bank|financ|insur|reit|real estate|conglomerat|holding|asset manag|capital market|broker|trust|mortgage|savings/.test(
      hay,
    ) || /insurance|diversified financial|thrifts/.test(hay)
  );
}

function checkPeVsHistory(input: AttractivenessInputs): AttractivenessCheckResult {
  const pe = input.peCurrent;
  const hist = input.histPeAvg;
  const peer = input.peerPe;
  const data = {
    peCurrent: pe,
    histPeAvg: hist,
    peerPe: peer,
  };
  if (pe == null || pe <= 0) {
    return { id: "pe_vs_history", numericId: 1, status: "unknown", data };
  }
  const vsHist = hist != null && hist > 0 ? pe / hist : null;
  const vsPeer = peer != null && peer > 0 ? pe / peer : null;
  if (vsHist == null && vsPeer == null) {
    return { id: "pe_vs_history", numericId: 1, status: "unknown", data };
  }
  const cheapHist = vsHist != null && vsHist <= 0.9;
  const cheapPeer = vsPeer != null && vsPeer <= 0.9;
  const richHist = vsHist != null && vsHist >= 1.2;
  const richPeer = vsPeer != null && vsPeer >= 1.2;
  if (cheapHist || cheapPeer) {
    return { id: "pe_vs_history", numericId: 1, status: "pass", data };
  }
  if (richHist || richPeer) {
    return { id: "pe_vs_history", numericId: 1, status: "fail", data };
  }
  return { id: "pe_vs_history", numericId: 1, status: "unknown", data };
}

function checkEpsGrowth(input: AttractivenessInputs): AttractivenessCheckResult {
  const g = input.epsCagrPct;
  const data = { epsCagrPct: g };
  if (g == null) {
    return { id: "eps_growth", numericId: 2, status: "unknown", data };
  }
  if (g >= 8) return { id: "eps_growth", numericId: 2, status: "pass", data };
  if (g < 0) return { id: "eps_growth", numericId: 2, status: "fail", data };
  return { id: "eps_growth", numericId: 2, status: "unknown", data };
}

function checkMarginTrend(input: AttractivenessInputs): AttractivenessCheckResult {
  const op = input.opMarginDeltaPp;
  const net = input.netMarginDeltaPp;
  const years = input.marginYears;
  const data = { opMarginDeltaPp: op, netMarginDeltaPp: net, marginYears: years };
  if ((op == null && net == null) || (years != null && years < 3)) {
    return { id: "margin_trend", numericId: 3, status: "unknown", data };
  }
  const primary = op ?? net;
  if (primary == null) {
    return { id: "margin_trend", numericId: 3, status: "unknown", data };
  }
  if (primary >= 0.5) {
    return { id: "margin_trend", numericId: 3, status: "pass", data };
  }
  if (primary <= -2) {
    return { id: "margin_trend", numericId: 3, status: "fail", data };
  }
  // Stable (±0.5 to -2): pass as "stable"
  if (primary > -2) {
    return { id: "margin_trend", numericId: 3, status: "pass", data };
  }
  return { id: "margin_trend", numericId: 3, status: "unknown", data };
}

function checkGraham(input: AttractivenessInputs): AttractivenessCheckResult {
  const pe = input.peCurrent;
  const fair = grahamFairPe(input.epsCagrPct);
  const data = {
    peCurrent: pe,
    epsCagrPct: input.epsCagrPct,
    grahamFairPe: fair,
  };
  if (pe == null || pe <= 0 || fair == null) {
    return { id: "graham_rule", numericId: 4, status: "unknown", data };
  }
  if (pe <= fair * 1.1) {
    return { id: "graham_rule", numericId: 4, status: "pass", data };
  }
  return { id: "graham_rule", numericId: 4, status: "fail", data };
}

function checkBalanceSheet(input: AttractivenessInputs): AttractivenessCheckResult {
  const data = {
    ndEbitda: input.ndEbitda,
    netCash: input.netCash,
    interestCoverage: input.interestCoverage,
  };
  if (input.netCash === true) {
    return { id: "balance_sheet", numericId: 5, status: "pass", data };
  }
  if (input.ndEbitda == null && input.interestCoverage == null) {
    return { id: "balance_sheet", numericId: 5, status: "unknown", data };
  }
  const leverageOk = input.ndEbitda != null && input.ndEbitda < 2.5;
  const leverageBad = input.ndEbitda != null && input.ndEbitda >= 3.5;
  const coverageOk =
    input.interestCoverage != null && input.interestCoverage > 4;
  const coverageBad =
    input.interestCoverage != null && input.interestCoverage < 2;
  if (leverageBad || coverageBad) {
    return { id: "balance_sheet", numericId: 5, status: "fail", data };
  }
  if (leverageOk || coverageOk) {
    return { id: "balance_sheet", numericId: 5, status: "pass", data };
  }
  return { id: "balance_sheet", numericId: 5, status: "unknown", data };
}

function checkMoat(input: AttractivenessInputs): AttractivenessCheckResult {
  const m = input.moatScorePct;
  const data = { moatScorePct: m };
  if (m == null) {
    return { id: "moat", numericId: 6, status: "unknown", data };
  }
  if (m >= 55) return { id: "moat", numericId: 6, status: "pass", data };
  if (m < 40) return { id: "moat", numericId: 6, status: "fail", data };
  return { id: "moat", numericId: 6, status: "unknown", data };
}

function checkCapitalAllocation(
  input: AttractivenessInputs,
): AttractivenessCheckResult {
  const shareCagr = input.shareCountCagrPct;
  const data = {
    shareCountCagrPct: shareCagr,
    buyback: input.buyback,
    severeDilution: input.severeDilution,
  };
  if (input.severeDilution === true) {
    return { id: "capital_allocation", numericId: 7, status: "fail", data };
  }
  if (input.buyback === true || (shareCagr != null && shareCagr < -2)) {
    return { id: "capital_allocation", numericId: 7, status: "pass", data };
  }
  if (shareCagr != null && shareCagr > 3) {
    return { id: "capital_allocation", numericId: 7, status: "fail", data };
  }
  if (shareCagr == null && input.buyback == null) {
    return { id: "capital_allocation", numericId: 7, status: "unknown", data };
  }
  return { id: "capital_allocation", numericId: 7, status: "unknown", data };
}

function checkPriceToBook(input: AttractivenessInputs): AttractivenessCheckResult {
  const applies = priceToBookApplies(input.sector, input.industry);
  const pb = input.priceToBook;
  const data = {
    priceToBook: pb,
    applies,
    sector: input.sector,
    industry: input.industry,
  };
  if (!applies) {
    return {
      id: "price_to_book",
      numericId: 8,
      status: "skipped",
      data,
      note: "P/B not primary for this business type",
    };
  }
  if (pb == null || pb <= 0) {
    return { id: "price_to_book", numericId: 8, status: "unknown", data };
  }
  if (pb < 1.5) return { id: "price_to_book", numericId: 8, status: "pass", data };
  if (pb > 3) return { id: "price_to_book", numericId: 8, status: "fail", data };
  return { id: "price_to_book", numericId: 8, status: "unknown", data };
}

export function scoreAttractiveness(
  input: AttractivenessInputs,
): AttractivenessScore {
  const checks: AttractivenessCheckResult[] = [
    checkPeVsHistory(input),
    checkEpsGrowth(input),
    checkMarginTrend(input),
    checkGraham(input),
    checkBalanceSheet(input),
    checkMoat(input),
    checkCapitalAllocation(input),
    checkPriceToBook(input),
  ];

  const passedIds = checks
    .filter((c) => c.status === "pass")
    .map((c) => c.numericId);
  const failedIds = checks
    .filter((c) => c.status === "fail")
    .map((c) => c.numericId);
  const scored = checks.filter((c) => c.status !== "skipped");
  const known = scored.filter((c) => c.status === "pass" || c.status === "fail");
  const coveragePct = scored.length === 0 ? 0 : (known.length / scored.length) * 100;
  const total =
    scored.length === 0
      ? null
      : (passedIds.length / scored.length) * 100;

  return { checks, passedIds, failedIds, total, coveragePct };
}

/** Margin trend from annual series (oldest → newest within window). */
export function marginDeltaFromSeries(
  series: ReadonlyArray<{
    operatingMarginPct?: number | null;
    netMarginPct?: number | null;
  }>,
): {
  opMarginDeltaPp: number | null;
  netMarginDeltaPp: number | null;
  marginYears: number;
} {
  // annualSeries is usually newest-first
  const op = series
    .map((r) => r.operatingMarginPct)
    .filter((n): n is number => n != null && Number.isFinite(n));
  const net = series
    .map((r) => r.netMarginPct)
    .filter((n): n is number => n != null && Number.isFinite(n));
  const window = Math.min(5, Math.max(op.length, net.length));
  if (window < 2) {
    return { opMarginDeltaPp: null, netMarginDeltaPp: null, marginYears: window };
  }
  // newest-first: index 0 = latest, index window-1 = oldest in window
  const opDelta =
    op.length >= 2 ? op[0]! - op[Math.min(window, op.length) - 1]! : null;
  const netDelta =
    net.length >= 2 ? net[0]! - net[Math.min(window, net.length) - 1]! : null;
  return {
    opMarginDeltaPp: opDelta,
    netMarginDeltaPp: netDelta,
    marginYears: window,
  };
}

/** EPS CAGR % from newest-first annual series. */
export function epsCagrPctFromSeries(
  series: ReadonlyArray<{ year?: number | null; eps?: number | null }>,
): number | null {
  const points = series
    .filter((r) => r.year != null && r.eps != null && (r.eps as number) > 0)
    .map((r) => ({ year: r.year as number, eps: r.eps as number }))
    .sort((a, b) => a.year - b.year);
  if (points.length < 4) return null;
  // trailing consecutive
  let run = [points[0]!];
  const runs: typeof points[] = [];
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    if (p.year === run[run.length - 1]!.year + 1) run.push(p);
    else {
      runs.push(run);
      run = [p];
    }
  }
  runs.push(run);
  const trailing = runs.at(-1);
  if (!trailing || trailing.length < 4) return null;
  const start = trailing[0]!;
  const end = trailing[trailing.length - 1]!;
  const n = end.year - start.year;
  if (n < 3 || start.eps <= 0 || end.eps <= 0) return null;
  return (Math.pow(end.eps / start.eps, 1 / n) - 1) * 100;
}
