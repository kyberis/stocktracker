import type { CashEntry, ExchangeRates, Holding, QuoteData } from "@/lib/types";
import { ALL_SECTORS } from "@/lib/crisis-scenarios";
import { computeTaxonomyAllocations } from "@/lib/services/taxonomy";
import { normalizeSectorLabel } from "@/lib/classification-normalize";
import { convertToEUR, resolveQuoteCurrency } from "@/lib/utils";

export type PortfolioRecommendationKind =
  | "diversify"
  | "concentration"
  | "cash_idle"
  | "fx";

export interface PortfolioRecommendation {
  kind: PortfolioRecommendationKind;
  key: string;
  priority: number;
  /** Human-readable payload for i18n interpolation / chips */
  titleParams: Record<string, string | number>;
  bodyParams: Record<string, string | number>;
  chips: Array<{ label: string; tone?: "default" | "warn" }>;
  /** Diversify: the two underweight sectors */
  sectors?: string[];
  /** Concentration: dominant ticker */
  ticker?: string;
  /** FX: dominant currency code */
  currency?: string;
  /** Cash / concentration metrics */
  pct?: number;
}

export interface BuildRecommendationsInput {
  holdings: Holding[];
  cashEntries: CashEntry[];
  quotes: Record<string, QuoteData>;
  exchangeRates: ExchangeRates;
  preferredCurrency: string;
}

/** Thresholds (locked in product plan). */
export const REC_THRESHOLDS = {
  minDistinctSectors: 5,
  hhiMax: 0.22,
  topSectorPct: 35,
  singleHoldingPct: 15,
  cashIdlePct: 20,
  fxDominantPct: 70,
} as const;

const CANONICAL_RESEARCH_SECTORS = ALL_SECTORS.filter((s) => s !== "Diversified");

function holdingValueEur(
  h: Holding,
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
): number {
  const q = quotes[h.ticker];
  if (q?.regularMarketPrice && q.regularMarketPrice > 0) {
    const qc = resolveQuoteCurrency(h.displayCurrency, q.currency);
    const converted = convertToEUR(h.shares * q.regularMarketPrice, qc, exchangeRates);
    if (Number.isFinite(converted) && converted > 0) return converted;
  }
  return h.valueInEUR > 0 ? h.valueInEUR : 0;
}

function holdingQuoteCurrency(h: Holding, quotes: Record<string, QuoteData>): string {
  const q = quotes[h.ticker];
  return resolveQuoteCurrency(h.displayCurrency, q?.currency).toUpperCase();
}

/** Pick two lowest canonical sectors by current allocation (0 if missing). */
export function pickUnderweightSectors(
  sectorAlloc: Array<{ label: string; percent: number }>,
  count = 2,
): Array<{ label: string; pct: number }> {
  const byKey = new Map<string, number>();
  for (const a of sectorAlloc) {
    const label = normalizeSectorLabel(a.label);
    byKey.set(label, a.percent);
  }

  const ranked = CANONICAL_RESEARCH_SECTORS.map((label) => ({
    label,
    pct: byKey.get(label) ?? byKey.get(normalizeSectorLabel(label)) ?? 0,
  })).sort((a, b) => a.pct - b.pct || a.label.localeCompare(b.label));

  return ranked.slice(0, count);
}

export function buildPortfolioRecommendations(
  input: BuildRecommendationsInput,
): PortfolioRecommendation[] {
  const { holdings, cashEntries, quotes, exchangeRates, preferredCurrency } = input;
  if (holdings.length === 0) return [];

  const holdingValues = holdings.map((h) => ({
    holding: h,
    valueEUR: holdingValueEur(h, quotes, exchangeRates),
  }));
  const investedEUR = holdingValues.reduce((s, r) => s + r.valueEUR, 0);
  const cashEUR = cashEntries.reduce((s, c) => s + (c.amountEUR || 0), 0);
  const totalEUR = investedEUR + cashEUR;
  if (totalEUR <= 0) return [];

  const sectorAlloc = computeTaxonomyAllocations(
    holdings,
    quotes,
    exchangeRates,
    "sector",
    "Unclassified",
  );
  const distinctSectors = new Set(
    sectorAlloc
      .filter((a) => a.label !== "Unclassified" && a.percent > 0)
      .map((a) => normalizeSectorLabel(a.label)),
  );
  const weights = holdingValues.map((r) => r.valueEUR / investedEUR);
  const hhi =
    investedEUR > 0 ? weights.reduce((s, w) => s + (Number.isFinite(w) ? w * w : 0), 0) : 1;
  const topSectorPct = sectorAlloc.reduce((m, a) => Math.max(m, a.percent), 0);

  const out: PortfolioRecommendation[] = [];

  // 1) Diversify
  const needsDiversify =
    distinctSectors.size < REC_THRESHOLDS.minDistinctSectors ||
    hhi >= REC_THRESHOLDS.hhiMax ||
    topSectorPct >= REC_THRESHOLDS.topSectorPct;

  if (needsDiversify) {
    const under = pickUnderweightSectors(
      sectorAlloc.map((a) => ({ label: a.label, percent: a.percent })),
      2,
    );
    if (under.length >= 2) {
      const [a, b] = under;
      const top = [...sectorAlloc].sort((x, y) => y.percent - x.percent)[0];
      out.push({
        kind: "diversify",
        key: `diversify:${a!.label}+${b!.label}`,
        priority: 1,
        titleParams: {},
        bodyParams: {
          topSector: top?.label ?? "Technology",
          topPct: Math.round(top?.percent ?? topSectorPct),
          sectorA: a!.label,
          sectorB: b!.label,
        },
        chips: [
          { label: `${a!.label} ${Math.round(a!.pct)}%` },
          { label: `${b!.label} ${Math.round(b!.pct)}%` },
        ],
        sectors: [a!.label, b!.label],
        pct: Math.round(topSectorPct),
      });
    }
  }

  // 2) Concentration — largest single holding
  const sortedHoldings = [...holdingValues].sort((a, b) => b.valueEUR - a.valueEUR);
  const topHolding = sortedHoldings[0];
  if (topHolding && totalEUR > 0) {
    const pct = (topHolding.valueEUR / totalEUR) * 100;
    if (pct >= REC_THRESHOLDS.singleHoldingPct) {
      const ticker = topHolding.holding.ticker;
      out.push({
        kind: "concentration",
        key: `concentration:${ticker.toUpperCase()}`,
        priority: 2,
        titleParams: { ticker },
        bodyParams: { ticker, pct: Math.round(pct) },
        chips: [{ label: `${ticker} ${Math.round(pct)}%`, tone: "warn" }],
        ticker,
        pct: Math.round(pct),
      });
    }
  }

  // 3) Cash idle
  const cashPct = (cashEUR / totalEUR) * 100;
  if (cashPct >= REC_THRESHOLDS.cashIdlePct) {
    out.push({
      kind: "cash_idle",
      key: "cash_idle",
      priority: 3,
      titleParams: {},
      bodyParams: { pct: Math.round(cashPct) },
      chips: [{ label: `Cash ${Math.round(cashPct)}%`, tone: "warn" }],
      pct: Math.round(cashPct),
    });
  }

  // 4) FX — dominant quote currency ≠ preferred
  const preferred = (preferredCurrency || "EUR").toUpperCase();
  const byCcy = new Map<string, number>();
  for (const row of holdingValues) {
    const ccy = holdingQuoteCurrency(row.holding, quotes);
    byCcy.set(ccy, (byCcy.get(ccy) ?? 0) + row.valueEUR);
  }
  let dominantCcy = preferred;
  let dominantVal = 0;
  for (const [ccy, val] of byCcy) {
    if (val > dominantVal) {
      dominantVal = val;
      dominantCcy = ccy;
    }
  }
  const fxPct = investedEUR > 0 ? (dominantVal / investedEUR) * 100 : 0;
  if (dominantCcy !== preferred && fxPct >= REC_THRESHOLDS.fxDominantPct) {
    out.push({
      kind: "fx",
      key: `fx:${dominantCcy}`,
      priority: 4,
      titleParams: { currency: dominantCcy },
      bodyParams: {
        currency: dominantCcy,
        pct: Math.round(fxPct),
        preferred,
      },
      chips: [{ label: `${dominantCcy} ${Math.round(fxPct)}%`, tone: "warn" }],
      currency: dominantCcy,
      pct: Math.round(fxPct),
    });
  }

  return out.sort((a, b) => a.priority - b.priority);
}

/** Filter out keys the user already skipped or acted on. */
export function filterRecommendationQueue(
  queue: PortfolioRecommendation[],
  dismissedKeys: Set<string>,
): PortfolioRecommendation[] {
  return queue.filter((r) => !dismissedKeys.has(r.key));
}
