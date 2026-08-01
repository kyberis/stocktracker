import type { AllocationSlice } from "@/lib/portfolio-summary";
import type { CashEntry, ExchangeRates, Holding, HoldingAssetType, ManualAssetType, QuoteData } from "@/lib/types";
import { hasExchangeRate, normalizeCurrency } from "@/lib/utils";

export interface BreakdownItem {
  key: string;
  label: string;
  color: string;
  value: number;
}

const CATEGORY_META: Record<string, { labelKey: string; color: string }> = {
  stock: { labelKey: "investments", color: "#6366f1" },
  etf: { labelKey: "investments", color: "#10b981" },
  crypto: { labelKey: "investments", color: "#f59e0b" },
  real_estate: { labelKey: "realEstate", color: "#3b82f6" },
  savings: { labelKey: "savingsAccounts", color: "#06b6d4" },
  pension: { labelKey: "pensionRetirement", color: "#8b5cf6" },
  cash: { labelKey: "assetTypeCash", color: "#64748b" },
};

export function hasManualAssets(cashEntries: CashEntry[]): boolean {
  return cashEntries.some((c) => c.type && c.type !== "cash");
}

export function computeNetWorthBreakdown(
  allocationSlices: AllocationSlice[],
  t: (key: string) => string,
): BreakdownItem[] {
  const investmentTypes = new Set<HoldingAssetType>(["stock", "etf", "fund", "crypto"]);
  const investmentSlices = allocationSlices.filter((s) => investmentTypes.has(s.key as HoldingAssetType));
  const investmentTotal = investmentSlices.reduce((sum, s) => sum + s.valueEUR, 0);

  const items: BreakdownItem[] = [];
  if (investmentTotal > 0) {
    items.push({ key: "investments", label: t("investments"), color: "#6366f1", value: investmentTotal });
  }
  const manualTypes: ManualAssetType[] = ["real_estate", "savings", "pension", "cash"];
  for (const type of manualTypes) {
    const slice = allocationSlices.find((s) => s.key === type);
    if (slice && slice.valueEUR > 0) {
      const meta = CATEGORY_META[type];
      items.push({ key: type, label: t(meta.labelKey), color: meta.color, value: slice.valueEUR });
    }
  }
  return items;
}

export function getMissingRateCurrencies(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
): string[] {
  const missing = new Set<string>();
  for (const h of holdings) {
    const q = quotes[h.ticker];
    const cur = normalizeCurrency(q?.currency || h.displayCurrency || "USD");
    if (cur !== "EUR" && !hasExchangeRate(cur, exchangeRates)) missing.add(cur);
  }
  if (baseCurrency !== "EUR" && !hasExchangeRate(baseCurrency, exchangeRates)) missing.add(baseCurrency);
  return [...missing];
}

export function computeDayGainLossPercent(dayGainLossEUR: number, totalCurrentEUR: number): number {
  if (totalCurrentEUR <= 0) return 0;
  return (dayGainLossEUR / (totalCurrentEUR - dayGainLossEUR)) * 100;
}

export function computeSimpleReturn(totalCurrent: number, totalCost: number): number {
  if (totalCost <= 0) return 0;
  return ((totalCurrent - totalCost) / totalCost) * 100;
}

export function computeCashTotal(cashEntries: CashEntry[]): number {
  return cashEntries.reduce((sum, e) => sum + e.amountEUR, 0);
}

export function groupCashByType(cashEntries: CashEntry[]): Record<ManualAssetType, CashEntry[]> {
  const grouped: Record<ManualAssetType, CashEntry[]> = {
    real_estate: [],
    savings: [],
    pension: [],
    cash: [],
  };
  for (const entry of cashEntries) {
    const type: ManualAssetType = (entry.type as ManualAssetType) ?? "cash";
    if (grouped[type]) {
      grouped[type].push(entry);
    } else {
      grouped.cash.push(entry);
    }
  }
  return grouped;
}

export function computeGroupTotals(
  grouped: Record<ManualAssetType, CashEntry[]>,
): Record<ManualAssetType, number> {
  const totals: Record<ManualAssetType, number> = {
    real_estate: 0,
    savings: 0,
    pension: 0,
    cash: 0,
  };
  for (const type of Object.keys(grouped) as ManualAssetType[]) {
    totals[type] = grouped[type].reduce((s, e) => s + e.amountEUR, 0);
  }
  return totals;
}

export function computeTransactionTotal(
  type: string,
  shares: number,
  pricePerShare: number,
): number {
  if (type === "dividend" || type === "fee") return pricePerShare;
  return shares * pricePerShare;
}

export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
