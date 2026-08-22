import type { DayChangeByType } from "@/lib/day-change-pct";
import type { AssetTypeTotals } from "@/lib/portfolio-summary";
import type { HoldingAssetType } from "@/lib/types";

export type WidgetAssetTypeKey = HoldingAssetType | "fixed_return";

export interface WidgetAssetTypeBreakdown {
  key: WidgetAssetTypeKey;
  value: number;
  allocationPercent: number;
  dayChange: number;
  dayChangePercent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

const ORDER: WidgetAssetTypeKey[] = ["stock", "etf", "fund", "crypto", "fixed_return"];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Builds per-asset-type rows for home-screen widgets.
 * Uses the same totals + day-change pipeline as the dashboard breakdown.
 */
export function buildByAssetTypeForWidget(
  byType: AssetTypeTotals,
  dayChangeByType: DayChangeByType,
): WidgetAssetTypeBreakdown[] {
  const rows: WidgetAssetTypeBreakdown[] = [];

  for (const key of ORDER) {
    const totals = byType[key];
    if (totals.totalCurrentEUR <= 0) continue;

    const dayAbs = dayChangeByType.abs[key] ?? totals.dayGainLossEUR;
    const dayPct = dayChangeByType.pct[key] ?? 0;

    rows.push({
      key,
      value: round2(totals.totalCurrentEUR),
      allocationPercent: round2(byType.allocations[key]),
      dayChange: round2(dayAbs),
      dayChangePercent: round2(dayPct),
      totalGainLoss: round2(totals.totalGainLoss),
      totalGainLossPercent: round2(totals.totalGainLossPercent),
    });
  }

  rows.sort((a, b) => b.value - a.value);
  return rows;
}
