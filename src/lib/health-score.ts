import type { QuoteData, CompanyOverview, Holding } from "./types";

// ---------------------------------------------------------------------------
// Holding Health Score
//
// A 0–10 composite score across 5 axes, each scored 0–10:
//   1. Valuation   – Is the stock reasonably priced?
//   2. Dividend     – Does it pay a sustainable, meaningful dividend?
//   3. Momentum     – Is the price trending favourably?
//   4. Stability    – How volatile / risky is this holding?
//   5. Quality      – Are the underlying fundamentals strong?
//
// Two data tiers:
//   • Basic  (QuoteData only)         → axes 2-4 use partial signals
//   • Full   (QuoteData + Overview)   → all axes use complete signals
//
// The composite is the weighted average of axes that have data.
// Axes with no usable inputs are excluded from the average, not zeroed.
// ---------------------------------------------------------------------------

export interface AxisScore {
  value: number;        // 0–10
  confidence: number;   // 0–1  (how much data was available)
  signals: string[];    // human-readable explanation of inputs used
}

export interface HealthScore {
  overall: number;            // 0–10 weighted composite
  confidence: number;         // 0–1  average data confidence
  tier: "basic" | "full";
  axes: {
    valuation: AxisScore | null;
    dividend: AxisScore | null;
    momentum: AxisScore | null;
    stability: AxisScore | null;
    quality: AxisScore | null;
  };
}

const AXIS_WEIGHTS = {
  valuation: 0.25,
  dividend: 0.15,
  momentum: 0.20,
  stability: 0.15,
  quality: 0.25,
} as const;

function clamp(v: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(value: number, inLow: number, inHigh: number, outLow: number, outHigh: number): number {
  if (inHigh === inLow) return (outLow + outHigh) / 2;
  const t = (value - inLow) / (inHigh - inLow);
  return outLow + t * (outHigh - outLow);
}

// ---------------------------------------------------------------------------
// Axis 1: Valuation
// Inputs: P/E, PEG, forwardPE, analystTargetPrice vs price
// Requires CompanyOverview — returns null with only QuoteData
// ---------------------------------------------------------------------------

function scoreValuation(
  quote: QuoteData,
  overview: CompanyOverview | null,
): AxisScore | null {
  if (!overview) return null;

  const signals: string[] = [];
  const scores: number[] = [];

  const pe = overview.peRatio;
  if (pe !== null && pe > 0) {
    // P/E 5-15 is excellent, 15-25 fair, 25-40 expensive, >40 very expensive
    const s = pe <= 15 ? lerp(pe, 5, 15, 10, 8)
            : pe <= 25 ? lerp(pe, 15, 25, 8, 5)
            : pe <= 40 ? lerp(pe, 25, 40, 5, 2)
            :            lerp(pe, 40, 80, 2, 0);
    scores.push(clamp(s));
    signals.push(`P/E ${pe.toFixed(1)}`);
  }

  const peg = overview.pegRatio;
  if (peg !== null && peg > 0) {
    // PEG < 1 is undervalued, 1-2 is fair, > 2 is overvalued
    const s = peg <= 1   ? lerp(peg, 0.3, 1, 10, 7)
            : peg <= 2   ? lerp(peg, 1, 2, 7, 4)
            :              lerp(peg, 2, 4, 4, 0);
    scores.push(clamp(s));
    signals.push(`PEG ${peg.toFixed(2)}`);
  }

  const fpe = overview.forwardPE;
  if (fpe !== null && fpe > 0 && pe !== null && pe > 0) {
    // Forward P/E lower than trailing P/E = expected growth
    const ratio = fpe / pe;
    const s = ratio < 0.8  ? 9
            : ratio < 1.0  ? 7
            : ratio < 1.2  ? 5
            :                3;
    scores.push(s);
    signals.push(`Fwd P/E ${fpe.toFixed(1)} vs trailing ${pe.toFixed(1)}`);
  }

  const target = overview.analystTargetPrice;
  const price = quote.regularMarketPrice;
  if (target !== null && target > 0 && price > 0) {
    const upside = ((target - price) / price) * 100;
    // >20% upside → strong, 0-20% fair, negative → overvalued
    const s = upside >= 20 ? lerp(upside, 20, 50, 8, 10)
            : upside >= 0  ? lerp(upside, 0, 20, 5, 8)
            :                lerp(upside, -30, 0, 1, 5);
    scores.push(clamp(s));
    signals.push(`Analyst target ${upside >= 0 ? "+" : ""}${upside.toFixed(0)}% upside`);
  }

  if (scores.length === 0) return null;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    value: Math.round(avg * 10) / 10,
    confidence: Math.min(1, scores.length / 4),
    signals,
  };
}

// ---------------------------------------------------------------------------
// Axis 2: Dividend
// Inputs: yield (from quote or overview), DPS, payout sustainability
// Basic tier: uses QuoteData trailingAnnualDividendYield
// Full tier: adds payout ratio estimation
// Non-dividend stocks score neutral (5) not zero
// ---------------------------------------------------------------------------

function scoreDividend(
  quote: QuoteData,
  overview: CompanyOverview | null,
): AxisScore | null {
  const signals: string[] = [];
  const scores: number[] = [];

  const yieldVal =
    overview?.dividendYield ??
    quote.trailingAnnualDividendYield ??
    null;

  if (yieldVal === null || yieldVal === 0) {
    // No dividend — neutral score (not penalised, growth stocks are valid)
    return {
      value: 5.0,
      confidence: 0.3,
      signals: ["No dividend — neutral"],
    };
  }

  const yieldPct = yieldVal > 1 ? yieldVal : yieldVal * 100;

  // Yield: 0-1% low, 1-3% moderate, 3-6% strong, >6% may be unsustainable
  if (yieldPct > 0) {
    const s = yieldPct <= 1   ? lerp(yieldPct, 0, 1, 3, 5)
            : yieldPct <= 3   ? lerp(yieldPct, 1, 3, 5, 8)
            : yieldPct <= 6   ? lerp(yieldPct, 3, 6, 8, 9)
            : yieldPct <= 10  ? lerp(yieldPct, 6, 10, 9, 6)
            :                   lerp(yieldPct, 10, 20, 6, 2);
    scores.push(clamp(s));
    signals.push(`Yield ${yieldPct.toFixed(2)}%`);
  }

  // Payout sustainability via profit margin as a proxy
  if (overview?.profitMargin !== null && overview?.profitMargin !== undefined) {
    const margin = overview.profitMargin * 100;
    // Higher margin → more room to sustain dividends
    const s = margin >= 20 ? 9
            : margin >= 10 ? 7
            : margin >= 5  ? 5
            : margin >= 0  ? 3
            :                1;
    scores.push(s);
    signals.push(`Profit margin ${margin.toFixed(1)}% (payout sustainability proxy)`);
  }

  if (scores.length === 0) return null;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    value: Math.round(avg * 10) / 10,
    confidence: Math.min(1, scores.length / 2),
    signals,
  };
}

// ---------------------------------------------------------------------------
// Axis 3: Momentum
// Inputs: day change %, distance from 52-week high/low, price vs MAs
// Basic tier: uses QuoteData (day change, 52w range)
// Full tier: adds 50-day and 200-day moving averages
// ---------------------------------------------------------------------------

function scoreMomentum(
  quote: QuoteData,
  overview: CompanyOverview | null,
): AxisScore | null {
  const signals: string[] = [];
  const scores: number[] = [];
  const price = quote.regularMarketPrice;

  if (price <= 0) return null;

  // 52-week range position: where is the price within the range?
  const high52 = quote.fiftyTwoWeekHigh;
  const low52 = quote.fiftyTwoWeekLow;
  if (high52 > 0 && low52 > 0 && high52 > low52) {
    const rangePosition = (price - low52) / (high52 - low52);
    // 0.7-1.0 = near high (bullish), 0.3-0.7 = mid (neutral), 0-0.3 = near low (bearish)
    const s = lerp(rangePosition, 0, 1, 2, 9);
    scores.push(clamp(s));
    const pctFromHigh = ((price - high52) / high52 * 100).toFixed(0);
    signals.push(`${(rangePosition * 100).toFixed(0)}% of 52w range (${pctFromHigh}% from high)`);
  }

  // Day change as a short-term signal (low weight — noisy)
  const dayChg = quote.regularMarketChangePercent;
  if (dayChg !== undefined) {
    const s = dayChg >= 3  ? 9
            : dayChg >= 1  ? 7
            : dayChg >= 0  ? 6
            : dayChg >= -1 ? 4
            : dayChg >= -3 ? 3
            :                1;
    scores.push(clamp(s));
    signals.push(`Day change ${dayChg >= 0 ? "+" : ""}${dayChg.toFixed(2)}%`);
  }

  // Moving averages (Pro — from overview)
  if (overview?.fiftyDayMA !== null && overview?.fiftyDayMA !== undefined) {
    const ma50 = overview.fiftyDayMA;
    const aboveMa50 = price > ma50;
    const pctFromMa50 = ((price - ma50) / ma50) * 100;
    const s = aboveMa50 ? lerp(pctFromMa50, 0, 15, 6, 9) : lerp(pctFromMa50, -15, 0, 2, 5);
    scores.push(clamp(s));
    signals.push(`${aboveMa50 ? "Above" : "Below"} 50d MA by ${Math.abs(pctFromMa50).toFixed(1)}%`);
  }

  if (overview?.twoHundredDayMA !== null && overview?.twoHundredDayMA !== undefined) {
    const ma200 = overview.twoHundredDayMA;
    const aboveMa200 = price > ma200;
    const pctFromMa200 = ((price - ma200) / ma200) * 100;
    const s = aboveMa200 ? lerp(pctFromMa200, 0, 20, 6, 9) : lerp(pctFromMa200, -20, 0, 2, 5);
    scores.push(clamp(s));
    signals.push(`${aboveMa200 ? "Above" : "Below"} 200d MA by ${Math.abs(pctFromMa200).toFixed(1)}%`);
  }

  if (scores.length === 0) return null;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    value: Math.round(avg * 10) / 10,
    confidence: Math.min(1, scores.length / 4),
    signals,
  };
}

// ---------------------------------------------------------------------------
// Axis 4: Stability
// Inputs: beta, 52-week range width (as % of price)
// Basic tier: uses 52w range width as a volatility proxy
// Full tier: adds beta from CompanyOverview
// ---------------------------------------------------------------------------

function scoreStability(
  quote: QuoteData,
  overview: CompanyOverview | null,
): AxisScore | null {
  const signals: string[] = [];
  const scores: number[] = [];
  const price = quote.regularMarketPrice;

  if (price <= 0) return null;

  // 52-week range width as volatility proxy
  const high52 = quote.fiftyTwoWeekHigh;
  const low52 = quote.fiftyTwoWeekLow;
  if (high52 > 0 && low52 > 0) {
    const rangeWidth = ((high52 - low52) / price) * 100;
    // Narrower range → more stable. <20% very stable, 20-40% moderate, >60% volatile
    const s = rangeWidth <= 20 ? lerp(rangeWidth, 5, 20, 10, 8)
            : rangeWidth <= 40 ? lerp(rangeWidth, 20, 40, 8, 5)
            : rangeWidth <= 60 ? lerp(rangeWidth, 40, 60, 5, 3)
            :                    lerp(rangeWidth, 60, 100, 3, 1);
    scores.push(clamp(s));
    signals.push(`52w range width ${rangeWidth.toFixed(0)}% of price`);
  }

  // Beta (Pro)
  const beta = overview?.beta;
  if (beta !== null && beta !== undefined) {
    // Beta 0.5-1.0 → stable, 1.0-1.5 → moderate, >1.5 → volatile, <0.5 → defensive
    const s = beta <= 0.5  ? 9
            : beta <= 1.0  ? lerp(beta, 0.5, 1.0, 9, 7)
            : beta <= 1.5  ? lerp(beta, 1.0, 1.5, 7, 4)
            : beta <= 2.0  ? lerp(beta, 1.5, 2.0, 4, 2)
            :                1;
    scores.push(clamp(s));
    signals.push(`Beta ${beta.toFixed(2)}`);
  }

  // Market cap as a stability proxy — larger companies tend to be more stable
  const mcap = quote.marketCap;
  if (mcap !== undefined && mcap > 0) {
    const mcapB = mcap / 1e9;
    const s = mcapB >= 200 ? 9
            : mcapB >= 50  ? 8
            : mcapB >= 10  ? 7
            : mcapB >= 2   ? 5
            : mcapB >= 0.3 ? 3
            :                2;
    scores.push(s);
    signals.push(`Market cap ${mcapB >= 1 ? mcapB.toFixed(0) + "B" : (mcap / 1e6).toFixed(0) + "M"}`);
  }

  if (scores.length === 0) return null;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    value: Math.round(avg * 10) / 10,
    confidence: Math.min(1, scores.length / 3),
    signals,
  };
}

// ---------------------------------------------------------------------------
// Axis 5: Quality (Fundamentals)
// Inputs: profitMargin, ROE, analyst ratings, EPS
// Requires CompanyOverview — returns null with only QuoteData
// ---------------------------------------------------------------------------

function scoreQuality(
  _quote: QuoteData,
  overview: CompanyOverview | null,
): AxisScore | null {
  if (!overview) return null;

  const signals: string[] = [];
  const scores: number[] = [];

  const margin = overview.profitMargin;
  if (margin !== null) {
    const marginPct = margin * 100;
    const s = marginPct >= 25 ? 10
            : marginPct >= 15 ? lerp(marginPct, 15, 25, 7, 10)
            : marginPct >= 5  ? lerp(marginPct, 5, 15, 4, 7)
            : marginPct >= 0  ? lerp(marginPct, 0, 5, 2, 4)
            :                   1;
    scores.push(clamp(s));
    signals.push(`Profit margin ${marginPct.toFixed(1)}%`);
  }

  const roe = overview.returnOnEquity;
  if (roe !== null) {
    const roePct = roe * 100;
    // ROE >15% is strong, 10-15% good, 5-10% average, <5% weak
    const s = roePct >= 20 ? 10
            : roePct >= 15 ? lerp(roePct, 15, 20, 8, 10)
            : roePct >= 10 ? lerp(roePct, 10, 15, 6, 8)
            : roePct >= 5  ? lerp(roePct, 5, 10, 4, 6)
            : roePct >= 0  ? lerp(roePct, 0, 5, 2, 4)
            :                1;
    scores.push(clamp(s));
    signals.push(`ROE ${roePct.toFixed(1)}%`);
  }

  const eps = overview.eps;
  if (eps !== null) {
    // Positive EPS is baseline; higher is better
    const s = eps > 10 ? 9
            : eps > 5  ? 8
            : eps > 2  ? 7
            : eps > 0  ? 5
            :            2;
    scores.push(clamp(s));
    signals.push(`EPS ${eps.toFixed(2)}`);
  }

  // Analyst consensus
  const ratings = overview.analystRatings;
  if (ratings !== null) {
    const total = ratings.strongBuy + ratings.buy + ratings.hold + ratings.sell + ratings.strongSell;
    if (total > 0) {
      const bullish = (ratings.strongBuy + ratings.buy) / total;
      const bearish = (ratings.sell + ratings.strongSell) / total;
      const s = bullish >= 0.7 ? lerp(bullish, 0.7, 1.0, 8, 10)
              : bullish >= 0.5 ? lerp(bullish, 0.5, 0.7, 6, 8)
              : bearish >= 0.5 ? lerp(bearish, 0.5, 0.7, 3, 1)
              :                  5;
      scores.push(clamp(s));
      signals.push(`Analyst consensus: ${(bullish * 100).toFixed(0)}% bullish (${total} ratings)`);
    }
  }

  if (scores.length === 0) return null;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    value: Math.round(avg * 10) / 10,
    confidence: Math.min(1, scores.length / 4),
    signals,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function calculateHealthScore(
  holding: Holding,
  quote: QuoteData | undefined,
  overview: CompanyOverview | null | undefined,
): HealthScore | null {
  if (!quote) return null;

  if (holding.assetType === "crypto") return null;

  const ov = overview ?? null;
  const tier = ov ? "full" : "basic";

  const axes = {
    valuation: scoreValuation(quote, ov),
    dividend: scoreDividend(quote, ov),
    momentum: scoreMomentum(quote, ov),
    stability: scoreStability(quote, ov),
    quality: scoreQuality(quote, ov),
  };

  const entries = (Object.keys(axes) as (keyof typeof axes)[])
    .filter((k) => axes[k] !== null)
    .map((k) => ({
      key: k,
      axis: axes[k]!,
      weight: AXIS_WEIGHTS[k],
    }));

  if (entries.length === 0) return null;

  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
  const weightedSum = entries.reduce(
    (s, e) => s + e.axis.value * (e.weight / totalWeight),
    0,
  );
  const avgConfidence =
    entries.reduce((s, e) => s + e.axis.confidence, 0) / entries.length;

  return {
    overall: Math.round(weightedSum * 10) / 10,
    confidence: Math.round(avgConfidence * 100) / 100,
    tier,
    axes,
  };
}

export function getScoreLabel(score: number): string {
  if (score >= 8.5) return "Excellent";
  if (score >= 7.0) return "Good";
  if (score >= 5.5) return "Fair";
  if (score >= 4.0) return "Weak";
  return "Poor";
}

export function getScoreColor(score: number): string {
  if (score >= 7.0) return "var(--gain)";
  if (score >= 5.0) return "var(--accent, #f59e0b)";
  return "var(--loss)";
}

export const AXIS_LABELS: Record<string, string> = {
  valuation: "Valuation",
  dividend: "Dividend",
  momentum: "Momentum",
  stability: "Stability",
  quality: "Quality",
};

export const AXIS_DESCRIPTIONS: Record<string, string> = {
  valuation: "P/E ratio, PEG ratio, forward earnings, analyst price targets",
  dividend: "Dividend yield, payout sustainability, profit margin coverage",
  momentum: "52-week range position, daily performance, moving average trends",
  stability: "Price volatility (beta), 52-week range width, market capitalisation",
  quality: "Profit margin, return on equity, earnings per share, analyst consensus",
};
