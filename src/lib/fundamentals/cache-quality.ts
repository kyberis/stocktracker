import type { CompanyOverview } from "@/lib/api-providers/types";
import type { FundamentalData } from "@/lib/types";
import type { FundamentalsCacheType, FundamentalsCacheProvider } from "@/lib/db/fundamentals-cache";
import { hasValuationMetrics } from "@/lib/fundamentals/overview-quality";

export function isCacheableOverview(data: CompanyOverview | null | undefined): boolean {
  if (!data?.symbol?.trim()) return false;
  return (
    hasValuationMetrics(data) ||
    data.returnOnEquity != null ||
    data.profitMargin != null ||
    data.revenueTTM != null
  );
}

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
  data: FundamentalData<unknown> | CompanyOverview | null,
  _provider: FundamentalsCacheProvider
): boolean {
  if (type === "overview") {
    return isCacheableOverview(data as CompanyOverview | null);
  }
  if (!data) return false;
  const statementData = data as FundamentalData<unknown>;
  if (statementData.annual.length === 0 && statementData.quarterly.length === 0) return false;

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
      return !hasEarningsSparsePattern(statementData);
    default:
      return false;
  }
}
