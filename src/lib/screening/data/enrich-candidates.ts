import { fetchFmpFundamentals } from "@/lib/screening/data/fmp-fundamentals";
import {
  loadTrefolioSignalsForTickers,
  type TrefolioTickerSignals,
} from "@/lib/screening/data/trefolio-signals";
import type { HardDataCandidate } from "@/lib/screening/schemas";
import { SCREENING_MAX_SCORE } from "@/lib/screening/criteria";

/**
 * Enrich ranked Hard Data candidates with FMP multiples + trefolio MOAT /
 * analysis cache. Populates typed report fields (never invents LLM numbers).
 */
export async function enrichHardDataCandidates(
  candidates: HardDataCandidate[],
): Promise<HardDataCandidate[]> {
  if (candidates.length === 0) return candidates;

  const signals = await loadTrefolioSignalsForTickers(
    candidates.map((c) => c.ticker),
  );

  const CONCURRENCY = 3;
  const enriched: HardDataCandidate[] = [];
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const chunk = candidates.slice(i, i + CONCURRENCY);
    const rows = await Promise.all(
      chunk.map(async (c) => {
        const fund = await fetchFmpFundamentals(c.ticker);
        const sig = signals.get(c.ticker.toUpperCase());
        return mergeCandidate(c, fund, sig);
      }),
    );
    enriched.push(...rows);
  }
  return enriched;
}

function mergeCandidate(
  c: HardDataCandidate,
  fund: Awaited<ReturnType<typeof fetchFmpFundamentals>>,
  sig: TrefolioTickerSignals | undefined,
): HardDataCandidate {
  const price = fund.price ?? c.price;
  const targetPrice = fund.targetPrice;
  let upsidePct: number | null = null;
  if (
    targetPrice != null &&
    price != null &&
    price > 0 &&
    Number.isFinite(targetPrice)
  ) {
    upsidePct = ((targetPrice - price) / price) * 100;
  }

  const growthNote =
    sig?.revenueYoyPct != null
      ? `Rev YoY ${sig.revenueYoyPct >= 0 ? "+" : ""}${sig.revenueYoyPct.toFixed(1)}%`
      : null;

  const valuationNote =
    fund.fwdPe != null
      ? `Fwd P/E ${fund.fwdPe.toFixed(1)}x`
      : fund.ownHistPe != null
        ? `P/E ${fund.ownHistPe.toFixed(1)}x`
        : null;

  const { score, stepsPassed, stepsFailed, verdict } = scoreCandidate({
    rankScore: c.rankScore,
    fwdPe: fund.fwdPe,
    ndEbitda: fund.ndEbitda,
    netCash: fund.netCash,
    moatScorePct: sig?.moatScorePct ?? null,
    upsidePct,
    hasCatalystHint: false,
    hasAnalysis: Boolean(sig?.hasAnalysisCache || sig?.analysisSummary),
  });

  return {
    ...c,
    price: price ?? c.price,
    currency: fund.currency ?? c.currency ?? "USD",
    fwdPe: fund.fwdPe,
    ownHistPe: fund.ownHistPe,
    evEbitda: fund.evEbitda,
    ndEbitda: fund.ndEbitda,
    dividendYield: fund.dividendYield,
    netCash: fund.netCash,
    targetPrice,
    upsidePct,
    moatScore: sig?.moatScorePct ?? null,
    moatVerdict: sig?.moatVerdict ?? null,
    analysisSummary: sig?.analysisSummary ?? fund.description,
    growthNote,
    valuationNote,
    checklistScore: score,
    stepsPassed,
    stepsFailed,
    reportVerdict: verdict,
  };
}

function scoreCandidate(input: {
  rankScore: number;
  fwdPe: number | null;
  ndEbitda: number | null;
  netCash: boolean | null;
  moatScorePct: number | null;
  upsidePct: number | null;
  hasCatalystHint: boolean;
  hasAnalysis: boolean;
}): {
  score: number;
  stepsPassed: number[];
  stepsFailed: number[];
  verdict: "fuerte" | "watch" | null;
} {
  const passed: number[] = [];
  const failed: number[] = [];

  // 1 relativeValuation — prefer fwd PE under ~18 when known
  if (input.fwdPe != null) {
    if (input.fwdPe > 0 && input.fwdPe < 18) passed.push(1);
    else failed.push(1);
  }

  // 2 price/fundamentals divergence — upside vs consensus
  if (input.upsidePct != null) {
    if (input.upsidePct >= 10) passed.push(2);
    else if (input.upsidePct < -5) failed.push(2);
  }

  // 5 balance sheet — net cash or modest ND/EBITDA
  if (input.netCash === true || (input.ndEbitda != null && input.ndEbitda < 2)) {
    passed.push(5);
  } else if (input.ndEbitda != null && input.ndEbitda >= 4) {
    failed.push(5);
  }

  // 7 competitive structure — trefolio MOAT
  if (input.moatScorePct != null) {
    if (input.moatScorePct >= 55) passed.push(7);
    else if (input.moatScorePct < 40) failed.push(7);
  }

  // 9 market signal — hard-data rank confidence
  if (input.rankScore >= 70) passed.push(9);
  else if (input.rankScore < 45) failed.push(9);

  // Soft pass for analysis presence (helps competitive/context narrative)
  if (input.hasAnalysis && !passed.includes(7) && input.moatScorePct == null) {
    // leave 7 unknown — analysis alone is not a moat pass
  }

  const score = Math.min(SCREENING_MAX_SCORE, passed.length);
  const verdict: "fuerte" | "watch" | null =
    score >= 5 && (input.moatScorePct == null || input.moatScorePct >= 50)
      ? "fuerte"
      : score >= 3
        ? "watch"
        : score > 0
          ? "watch"
          : null;

  return { score, stepsPassed: passed, stepsFailed: failed, verdict };
}

/** Compact rows for the Hard Data LLM universe (ranking context). */
export function summariseUniverseWithSignals<
  T extends {
    ticker: string;
    name: string;
    sector: string | null;
    industry: string | null;
    country: string | null;
    marketCapUsd: number | null;
    price: number | null;
  },
>(
  rows: T[],
  signals: Map<string, TrefolioTickerSignals>,
  maxRows: number,
): Array<
  T & {
    moatScorePct: number | null;
    moatVerdict: string | null;
    hasAnalisis: boolean;
    analysisSnippet: string | null;
  }
> {
  return rows.slice(0, maxRows).map((r) => {
    const sig = signals.get(r.ticker.toUpperCase());
    return {
      ...r,
      moatScorePct: sig?.moatScorePct ?? null,
      moatVerdict: sig?.moatVerdict ?? null,
      hasAnalisis: Boolean(sig?.hasAnalysisCache),
      analysisSnippet: sig?.analysisSummary ?? null,
    };
  });
}
