import type { FundamentalData } from "@/lib/types";
import type { FundamentalsCacheType, FundamentalsCacheProvider } from "@/lib/db/fundamentals-cache";

function allPeriods<T>(data: FundamentalData<T>): T[] {
  return [...data.annual, ...data.quarterly];
}

function isNullOrZero(n: number | null | undefined): boolean {
  return n == null || n === 0;
}

function hasIncomeSparsePattern(data: FundamentalData<{
  totalRevenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
}>): boolean {
  const periods = allPeriods(data);
  const withRevenue = periods.filter((p) => (p.totalRevenue ?? 0) > 0);
  if (withRevenue.length === 0) return false;
  return withRevenue.every(
    (p) => isNullOrZero(p.costOfRevenue) && isNullOrZero(p.grossProfit)
  );
}

function hasBalanceSparsePattern(data: FundamentalData<{ totalAssets: number | null }>): boolean {
  const periods = allPeriods(data);
  if (periods.length === 0) return true;
  return periods.every((p) => p.totalAssets == null);
}

function hasCashflowSparsePattern(data: FundamentalData<{ operatingCashflow: number | null }>): boolean {
  const periods = allPeriods(data);
  if (periods.length === 0) return true;
  return periods.every((p) => p.operatingCashflow == null);
}

function hasEarningsSparsePattern(data: FundamentalData<unknown>): boolean {
  return data.quarterly.length === 0 && data.annual.length === 0;
}

export function isCacheableFundamentalData(
  type: FundamentalsCacheType,
  data: FundamentalData<unknown> | null,
  _provider: FundamentalsCacheProvider
): boolean {
  if (!data) return false;
  if (data.annual.length === 0 && data.quarterly.length === 0) return false;

  switch (type) {
    case "income":
      return !hasIncomeSparsePattern(
        data as FundamentalData<{
          totalRevenue: number | null;
          costOfRevenue: number | null;
          grossProfit: number | null;
        }>
      );
    case "balance":
      return !hasBalanceSparsePattern(data as FundamentalData<{ totalAssets: number | null }>);
    case "cashflow":
      return !hasCashflowSparsePattern(
        data as FundamentalData<{ operatingCashflow: number | null }>
      );
    case "earnings":
      return !hasEarningsSparsePattern(data);
    default:
      return false;
  }
}
