import type {
  CompanyOverview,
  IncomeStatementReport,
  BalanceSheetReport,
  CashFlowReport,
  FundamentalData,
  EarningsReport,
  CriterionResult,
  CriterionStatus,
  MoatEvaluation,
} from "./types";
import type {} from "./api-providers/types";

const MAX_SCORE_PER_CRITERION = 12.5;

interface EvalInput {
  overview: CompanyOverview;
  income: FundamentalData<IncomeStatementReport>;
  balance: FundamentalData<BalanceSheetReport>;
  cashflow: FundamentalData<CashFlowReport>;
  earnings: FundamentalData<EarningsReport>;
}

function linearScore(value: number, passThreshold: number, warnThreshold: number, max: number, invert = false): number {
  if (invert) {
    if (value <= passThreshold) return max;
    if (value <= warnThreshold) return max * 0.5;
    return 0;
  }
  if (value >= passThreshold) return max;
  if (value >= warnThreshold) return max * 0.5;
  return max * Math.max(0, value / warnThreshold) * 0.4;
}

function trendGrowthRate(values: number[]): number {
  if (values.length < 2) return 0;
  const nonZero = values.filter((v) => v !== 0);
  if (nonZero.length < 2) return 0;
  const first = nonZero[0];
  const last = nonZero[nonZero.length - 1];
  if (first === 0) return 0;
  return ((last - first) / Math.abs(first)) * 100;
}

function trendConsistency(values: number[]): number {
  if (values.length < 3) return 0;
  let increases = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] >= values[i - 1]) increases++;
  }
  return increases / (values.length - 1);
}

function statusFromScore(score: number, max: number): CriterionStatus {
  const ratio = score / max;
  if (ratio >= 0.75) return "pass";
  if (ratio >= 0.35) return "warning";
  return "fail";
}

function scoreEarningsConsistency(income: FundamentalData<IncomeStatementReport>): CriterionResult {
  const annual = income.annual.slice(0, 10).reverse();
  const netIncomes = annual.map((r) => r.netIncome ?? 0);
  const trend = netIncomes.map((v) => v / 1e9);

  const consistency = trendConsistency(netIncomes);
  const growth = trendGrowthRate(netIncomes);
  const hasGrowth = growth > 0;
  const isConsistent = consistency >= 0.6;

  let score = 0;
  if (isConsistent && hasGrowth) score = MAX_SCORE_PER_CRITERION;
  else if (isConsistent || hasGrowth) score = MAX_SCORE_PER_CRITERION * 0.6;
  else if (consistency >= 0.4) score = MAX_SCORE_PER_CRITERION * 0.3;

  const status = statusFromScore(score, MAX_SCORE_PER_CRITERION);

  return {
    key: "earnings_consistency",
    name: "Earnings Consistency",
    status,
    value: `${annual.length}yr ${hasGrowth ? "Growth" : "Flat"}`,
    numericValue: growth,
    benchmark: "Steady growth, no erratic swings",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    trend,
  };
}

function scoreGrossMargin(income: FundamentalData<IncomeStatementReport>): CriterionResult {
  const annual = income.annual.slice(0, 10).reverse();
  const margins = annual.map((r) => {
    if (!r.grossProfit || !r.totalRevenue || r.totalRevenue === 0) return 0;
    return (r.grossProfit / r.totalRevenue) * 100;
  });

  const current = margins.length > 0 ? margins[margins.length - 1] : 0;
  const avg = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;

  const score = linearScore(avg, 40, 30, MAX_SCORE_PER_CRITERION);
  const status = statusFromScore(score, MAX_SCORE_PER_CRITERION);

  return {
    key: "gross_margin",
    name: "Gross Margin",
    status,
    value: `${current.toFixed(1)}%`,
    numericValue: current,
    benchmark: `≥ 40% (${annual.length}yr avg: ${avg.toFixed(1)}%)`,
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    trend: margins,
  };
}

function scoreNetMargin(income: FundamentalData<IncomeStatementReport>): CriterionResult {
  const annual = income.annual.slice(0, 10).reverse();
  const margins = annual.map((r) => {
    if (!r.netIncome || !r.totalRevenue || r.totalRevenue === 0) return 0;
    return (r.netIncome / r.totalRevenue) * 100;
  });

  const current = margins.length > 0 ? margins[margins.length - 1] : 0;
  const avg = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;

  const score = linearScore(avg, 20, 10, MAX_SCORE_PER_CRITERION);
  const status = statusFromScore(score, MAX_SCORE_PER_CRITERION);

  return {
    key: "net_margin",
    name: "Net Margin",
    status,
    value: `${current.toFixed(1)}%`,
    numericValue: current,
    benchmark: `≥ 20% (${annual.length}yr avg: ${avg.toFixed(1)}%)`,
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    trend: margins,
  };
}

function nopat(r: IncomeStatementReport): number | null {
  const ebit = r.operatingIncome;
  if (ebit == null || !Number.isFinite(ebit)) return null;
  const pretax = r.incomeBeforeTax;
  const tax = r.incomeTaxExpense;
  if (pretax != null && pretax > 0 && tax != null && Number.isFinite(tax)) {
    const rate = Math.min(0.5, Math.max(0, tax / pretax));
    return ebit * (1 - rate);
  }
  return null;
}

/**
 * Operating invested capital. Prefer equity + interest-bearing debt − cash
 * (cash buybacks leave this invariant). If that is ≤ 0 (net-cash balance
 * sheet), fall back to equity + debt so ROIC is defined.
 */
function investedCapital(b: BalanceSheetReport): number | null {
  const equity = b.totalShareholderEquity;
  if (equity == null || !Number.isFinite(equity)) return null;
  const debt = (b.longTermDebt ?? 0) + (b.shortTermDebt ?? 0);
  const cash = b.cashAndEquivalents ?? 0;
  const exCash = equity + debt - cash;
  if (exCash > 0) return exCash;
  const gross = equity + debt;
  return gross > 0 ? gross : null;
}

function scoreRetainedEarnings(balance: FundamentalData<BalanceSheetReport>, cashflow: FundamentalData<CashFlowReport>): CriterionResult {
  const annual = balance.annual.slice(0, 10).reverse();
  const retained = annual.map((r) => r.retainedEarnings ?? 0);
  const trend = retained.map((v) => v / 1e9);

  const growth = trendGrowthRate(retained);
  const consistency = trendConsistency(retained);

  const cfAnnual = cashflow.annual.slice(0, 5);
  let buybackCash = 0;
  let fcfSum = 0;
  for (const r of cfAnnual) {
    buybackCash += Math.abs(r.shareRepurchase ?? 0) + Math.abs(r.paymentsForRepurchaseOfEquity ?? 0);
    fcfSum += r.freeCashFlow ?? 0;
  }
  const hasBuybacks = buybackCash > 0;

  let score: number;
  let label: string;
  let benchmark: string;
  if (hasBuybacks) {
    // Declining retained earnings is the bookkeeping of retiring equity, not a
    // second quality failure next to ROIC. Score whether cash returns were
    // funded by free cash flow.
    const covered = fcfSum >= buybackCash * 0.8;
    score = covered
      ? MAX_SCORE_PER_CRITERION
      : fcfSum > 0
        ? MAX_SCORE_PER_CRITERION * 0.7
        : MAX_SCORE_PER_CRITERION * 0.35;
    label = covered ? "Buybacks (FCF-funded)" : "Buybacks (check FCF)";
    benchmark = "RE not comparable under buybacks — require FCF to fund repurchases";
  } else if (consistency >= 0.6 && growth > 0) {
    score = MAX_SCORE_PER_CRITERION;
    label = growth > 10 ? "Growing" : "Stable";
    benchmark = "Steady upward trend";
  } else if (consistency >= 0.4) {
    score = MAX_SCORE_PER_CRITERION * 0.4;
    label = growth > 0 ? "Uneven" : "Declining";
    benchmark = "Steady upward trend";
  } else {
    score = MAX_SCORE_PER_CRITERION * 0.15;
    label = "Declining";
    benchmark = "Steady upward trend";
  }

  const status = statusFromScore(score, MAX_SCORE_PER_CRITERION);

  return {
    key: "retained_earnings",
    name: "Retained Earnings",
    status,
    value: label,
    numericValue: growth,
    benchmark,
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    trend,
  };
}

function scoreROIC(
  income: FundamentalData<IncomeStatementReport>,
  balance: FundamentalData<BalanceSheetReport>,
): CriterionResult {
  const bal = balance.annual.slice(0, 10).reverse();
  const inc = income.annual.slice(0, 10).reverse();
  const roics: number[] = [];

  for (let i = 0; i < Math.min(bal.length, inc.length); i++) {
    const ic = investedCapital(bal[i]);
    const n = nopat(inc[i]);
    if (ic == null || n == null) continue;
    roics.push((n / ic) * 100);
  }

  const current = roics.length > 0 ? roics[roics.length - 1] : 0;
  const avg = roics.length > 0 ? roics.reduce((a, b) => a + b, 0) / roics.length : current;

  const score =
    roics.length === 0
      ? 0
      : linearScore(avg, 15, 8, MAX_SCORE_PER_CRITERION);
  const status = statusFromScore(score, MAX_SCORE_PER_CRITERION);

  return {
    key: "return_on_invested_capital",
    name: "Return on Invested Capital",
    status,
    value: roics.length === 0 ? "n/a" : `${current.toFixed(1)}%`,
    numericValue: roics.length === 0 ? null : current,
    benchmark: "ROIC ≥ 15% (not ROE — buybacks shrink equity and inflate ROE)",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    trend: roics,
  };
}

function scoreDebtSustainability(income: FundamentalData<IncomeStatementReport>, balance: FundamentalData<BalanceSheetReport>): CriterionResult {
  const latestBalance = balance.annual[0];
  const latestIncome = income.annual[0];

  const ltDebt = latestBalance?.longTermDebt ?? 0;
  const netIncome = latestIncome?.netIncome ?? 0;

  let ratio: number;
  if (netIncome <= 0 || ltDebt <= 0) {
    ratio = ltDebt <= 0 ? 0 : 99;
  } else {
    ratio = ltDebt / netIncome;
  }

  const annualBal = balance.annual.slice(0, 10).reverse();
  const annualInc = income.annual.slice(0, 10).reverse();
  const trend: number[] = [];
  for (let i = 0; i < Math.min(annualBal.length, annualInc.length); i++) {
    const d = annualBal[i].longTermDebt ?? 0;
    const ni = annualInc[i].netIncome ?? 1;
    trend.push(ni > 0 ? d / ni : 10);
  }

  const score = linearScore(ratio, 2, 4, MAX_SCORE_PER_CRITERION, true);
  const status = statusFromScore(score, MAX_SCORE_PER_CRITERION);

  return {
    key: "debt_sustainability",
    name: "Debt Sustainability",
    status,
    value: `${ratio.toFixed(1)} yrs`,
    numericValue: ratio,
    benchmark: "LT Debt repayable in < 4 yrs of earnings",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    trend,
  };
}

function scoreCapExEfficiency(income: FundamentalData<IncomeStatementReport>, cashflow: FundamentalData<CashFlowReport>): CriterionResult {
  const cfAnnual = cashflow.annual.slice(0, 10).reverse();
  const incAnnual = income.annual.slice(0, 10).reverse();
  const ratios: number[] = [];

  for (let i = 0; i < Math.min(cfAnnual.length, incAnnual.length); i++) {
    const capex = Math.abs(cfAnnual[i].capitalExpenditures ?? 0);
    const ni = incAnnual[i].netIncome ?? 0;
    if (ni > 0) ratios.push((capex / ni) * 100);
  }

  const current = ratios.length > 0 ? ratios[ratios.length - 1] : 0;
  const avg = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;

  const score = linearScore(avg, 25, 50, MAX_SCORE_PER_CRITERION, true);
  const status = statusFromScore(score, MAX_SCORE_PER_CRITERION);
  const tier = avg < 25 ? "Very Good" : avg < 50 ? "Acceptable" : "Warning";

  return {
    key: "capex_efficiency",
    name: "CapEx Efficiency",
    status,
    value: `${current.toFixed(1)}%`,
    numericValue: current,
    benchmark: `CapEx < 25% of earnings (${tier})`,
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    trend: ratios,
  };
}

function scoreProductDurability(overview: CompanyOverview, income: FundamentalData<IncomeStatementReport>): CriterionResult {
  const latestIncome = income.annual[0];
  const revenue = latestIncome?.totalRevenue ?? 0;
  const rd = latestIncome?.researchAndDevelopment ?? 0;
  const rdRatio = revenue > 0 ? (rd / revenue) * 100 : 0;

  const sector = overview.sector || "Unknown";
  const durableSectors = new Set([
    "Consumer Defensive",
    "Consumer Staples",
    "Utilities",
    "Financial Services",
    "Healthcare",
    "Industrials",
    "Basic Materials",
    "Real Estate",
    "Energy",
  ]);
  const isDurableSector = durableSectors.has(sector);

  let score: number;
  if (rdRatio < 3 && isDurableSector) score = MAX_SCORE_PER_CRITERION;
  else if (rdRatio < 5) score = MAX_SCORE_PER_CRITERION * 0.8;
  else if (rdRatio < 10 && isDurableSector) score = MAX_SCORE_PER_CRITERION * 0.7;
  else if (rdRatio < 10) score = MAX_SCORE_PER_CRITERION * 0.55;
  else if (rdRatio < 15) score = MAX_SCORE_PER_CRITERION * 0.35;
  else score = MAX_SCORE_PER_CRITERION * 0.15;

  const status = statusFromScore(score, MAX_SCORE_PER_CRITERION);

  return {
    key: "product_durability",
    name: "Product Durability",
    status,
    value: `R&D: ${rdRatio.toFixed(1)}%`,
    numericValue: rdRatio,
    benchmark: `Minimal R&D = consistent product${!isDurableSector ? " (tech exception)" : ""}`,
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    trend: [],
  };
}

function computeAugmentedPayout(income: FundamentalData<IncomeStatementReport>, cashflow: FundamentalData<CashFlowReport>): number | null {
  const cf = cashflow.annual[0];
  const inc = income.annual[0];
  if (!cf || !inc) return null;

  const ni = inc.netIncome ?? 0;
  if (ni <= 0) return null;

  const dividends = Math.abs(cf.dividendPayout ?? 0);
  const buybacks = Math.abs(cf.shareRepurchase ?? cf.paymentsForRepurchaseOfEquity ?? 0);
  return ((dividends + buybacks) / ni) * 100;
}

function computeVerdict(totalScore: number, maxScore: number): string {
  const pct = (totalScore / maxScore) * 100;
  if (pct >= 70) return "Strong Durable Competitive Advantage";
  if (pct >= 50) return "Moderate Competitive Advantage";
  if (pct >= 35) return "Narrow Moat — Proceed with Caution";
  return "No Clear Moat Detected";
}

export function evaluateMoat(input: EvalInput): MoatEvaluation {
  const criteria: CriterionResult[] = [
    scoreEarningsConsistency(input.income),
    scoreGrossMargin(input.income),
    scoreNetMargin(input.income),
    scoreRetainedEarnings(input.balance, input.cashflow),
    scoreROIC(input.income, input.balance),
    scoreDebtSustainability(input.income, input.balance),
    scoreCapExEfficiency(input.income, input.cashflow),
    scoreProductDurability(input.overview, input.income),
  ];

  const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
  const maxScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);
  const passedCount = criteria.filter((c) => c.status === "pass").length;

  const augmentedPayout = computeAugmentedPayout(input.income, input.cashflow);
  const peRatio = input.overview.peRatio;
  const forwardPE = input.overview.forwardPE ?? null;
  const pegRatio = input.overview.pegRatio;

  return {
    symbol: input.overview.symbol,
    companyName: input.overview.name,
    sector: input.overview.sector,
    industry: input.overview.industry,
    totalScore: Math.round(totalScore * 10) / 10,
    maxScore,
    verdict: computeVerdict(totalScore, maxScore),
    criteriaCount: criteria.length,
    passedCount,
    criteria,
    valuation: {
      peRatio,
      forwardPE,
      pegRatio,
      augmentedPayoutRatio: augmentedPayout != null ? Math.round(augmentedPayout * 10) / 10 : null,
      sellTrigger: peRatio != null && peRatio >= 40,
    },
    overview: input.overview as unknown as Record<string, unknown>,
    income: input.income as unknown as Record<string, unknown>,
    balance: input.balance as unknown as Record<string, unknown>,
    cashflow: input.cashflow as unknown as Record<string, unknown>,
    earnings: input.earnings as unknown as Record<string, unknown>,
  };
}
