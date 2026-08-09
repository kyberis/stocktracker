import { ensureMoatForTickers } from "@/lib/screening/data/ensure-moat";
import { fetchFmpFundamentals } from "@/lib/screening/data/fmp-fundamentals";
import {
  loadTrefolioSignalsForTickers,
  type TrefolioTickerSignals,
} from "@/lib/screening/data/trefolio-signals";
import {
  hardDataOutputSchema,
  type HardDataCandidate,
} from "@/lib/screening/schemas";
import { scoreChecklist } from "@/lib/screening/scoring/checklist";

/**
 * True when most candidates lack PE / EV multiples — usually because they were
 * enriched against outdated FMP field names — OR when we haven't yet stored
 * multi-year revenue history (introduced with the checklist scoring upgrade).
 * Report GET re-runs enrichment when this returns true.
 */
export function hardDataNeedsFundamentalsBackfill(
  candidates: HardDataCandidate[],
): boolean {
  if (candidates.length === 0) return false;
  const sparse = candidates.filter(
    (c) => c.ownHistPe == null && c.fwdPe == null && c.evEbitda == null,
  );
  if (sparse.length >= Math.ceil(candidates.length / 2)) return true;
  // Backfill 5y history for older runs so criterion 4 leaves "unknown".
  const missingHistory = candidates.filter(
    (c) => !c.revenueGrowthHistoryPct || c.revenueGrowthHistoryPct.length === 0,
  );
  if (missingHistory.length >= Math.ceil(candidates.length / 2)) return true;
  // Backfill earnings-quality fields introduced for criterion 1 hardening.
  const missingQuality = candidates.filter(
    (c) => c.earningsQualitySuspect == null && c.normalizedPe == null,
  );
  if (missingQuality.length >= Math.ceil(candidates.length / 2)) return true;
  // Backfill multi-year PE history for cheap-vs-history category scoring.
  const missingHistPe = candidates.filter(
    (c) => c.histPeAvg == null && (c.histPeYears == null || c.histPeYears === 0),
  );
  if (missingHistPe.length >= Math.ceil(candidates.length / 2)) return true;
  // Backfill Estebaranz annual series (margins / FCF / ROIC / shares).
  const missingSeries = candidates.filter(
    (c) => !c.annualSeries || c.annualSeries.length === 0,
  );
  return missingSeries.length >= Math.ceil(candidates.length / 2);
}

/**
 * Re-enrich a persisted Hard Data `output_json` when multiples are sparse.
 * Returns null when no backfill is needed or JSON is invalid.
 */
export async function backfillHardDataOutputJson(
  outputJson: string,
): Promise<string | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(outputJson);
  } catch {
    return null;
  }
  const hd = hardDataOutputSchema.safeParse(parsed);
  if (!hd.success) return null;
  if (!hardDataNeedsFundamentalsBackfill(hd.data.candidates)) return null;
  const enriched = await enrichHardDataCandidates(hd.data.candidates);
  return JSON.stringify({ ...hd.data, candidates: enriched });
}

/**
 * Enrich ranked Hard Data candidates with FMP multiples + trefolio MOAT /
 * analysis cache. Populates typed report fields (never invents LLM numbers).
 * MOAT cache misses are filled via evaluateMoat + upsert (ops path, no user quota).
 */
export async function enrichHardDataCandidates(
  candidates: HardDataCandidate[],
): Promise<HardDataCandidate[]> {
  if (candidates.length === 0) return candidates;

  try {
    await ensureMoatForTickers(candidates.map((c) => c.ticker));
  } catch (err) {
    console.warn(
      "[screening/enrich] ensureMoatForTickers failed",
      err instanceof Error ? err.message : err,
    );
  }

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

  const revYoy = sig?.revenueYoyPct ?? fund.revenueGrowthPct;
  const growthNote =
    revYoy != null
      ? `Rev YoY ${revYoy >= 0 ? "+" : ""}${revYoy.toFixed(1)}%`
      : null;

  const valuationNote = (() => {
    if (fund.earningsQualitySuspect && fund.normalizedPe != null) {
      return `Norm P/E ${fund.normalizedPe.toFixed(1)}x (TTM quality flag)`;
    }
    if (fund.fwdPe != null) return `Fwd P/E ${fund.fwdPe.toFixed(1)}x`;
    if (fund.ownHistPe != null) return `P/E ${fund.ownHistPe.toFixed(1)}x`;
    return null;
  })();

  // Deterministic scoring using everything Hard Data has. Compose can later
  // re-score with IR / Web / Technicals to fill criteria 3, 4, 6 and refine 9.
  const {
    score,
    stepsPassed,
    stepsFailed,
    verdict,
    earningsResilient,
  } = scoreChecklist({
    rankScore: c.rankScore,
    fwdPe: fund.fwdPe,
    ownHistPe: fund.ownHistPe,
    normalizedPe: fund.normalizedPe,
    earningsQualitySuspect: fund.earningsQualitySuspect,
    ndEbitda: fund.ndEbitda,
    netCash: fund.netCash,
    moatScorePct: sig?.moatScorePct ?? null,
    upsidePct,
    revenueGrowthHistoryPct: fund.revenueGrowthHistoryPct,
  });

  return {
    ...c,
    price: price ?? c.price,
    currency: fund.currency ?? c.currency ?? "USD",
    fwdPe: fund.fwdPe,
    ownHistPe: fund.ownHistPe,
    histPeAvg: fund.histPeAvg,
    histPeYears: fund.histPeYears,
    normalizedPe: fund.normalizedPe,
    earningsQualitySuspect: fund.earningsQualitySuspect,
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
    revenueGrowthHistoryPct:
      fund.revenueGrowthHistoryPct.length > 0
        ? fund.revenueGrowthHistoryPct
        : null,
    earningsResilient,
    checklistScore: score,
    stepsPassed,
    stepsFailed,
    reportVerdict: verdict,
    annualSeries:
      fund.annualSeries && fund.annualSeries.length > 0
        ? fund.annualSeries
        : undefined,
    fcfYield: fund.fcfYield ?? null,
    evEbit: fund.evEbit ?? null,
    interestCoverage: fund.interestCoverage ?? null,
    buyback: fund.buyback ?? null,
    severeDilution: fund.severeDilution ?? null,
    avgVolume: fund.avgVolume ?? null,
    thinLiquidity: fund.thinLiquidity ?? null,
    peerPe: fund.peerPe ?? null,
    roicPct: fund.roicPct ?? null,
  };
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
