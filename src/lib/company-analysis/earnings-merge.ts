import type { EarningsReport, FundamentalData } from "@/lib/api-providers/types";
import type { FmpEarningsEvent } from "@/lib/api-providers/fmp";

/** Convert FMP `/earnings` rows into the shared EarningsReport shape. */
export function fmpEarningsToFundamentalData(
  rows: FmpEarningsEvent[],
): FundamentalData<EarningsReport> | null {
  if (!rows.length) return null;
  const quarterly: EarningsReport[] = rows.map((r) => ({
    fiscalDateEnding: r.date || r.fiscalDateEnding || "",
    reportedEPS: r.eps,
    estimatedEPS: r.epsEstimated,
    surprise:
      r.eps != null && r.epsEstimated != null ? r.eps - r.epsEstimated : null,
    surprisePercentage:
      r.eps != null && r.epsEstimated != null && r.epsEstimated !== 0
        ? ((r.eps - r.epsEstimated) / Math.abs(r.epsEstimated)) * 100
        : null,
  }));
  const annual = quarterly.filter((_, i) => i % 4 === 0).slice(0, 10);
  return {
    annual: annual.length > 0 ? annual : quarterly.slice(0, 10),
    quarterly: quarterly.slice(0, 16),
  };
}

/**
 * Prefer primary (Yahoo) earnings history, but fill a missing last reported EPS
 * from FMP so header/table EPS is not stuck on unavailable.
 */
export function mergeEarningsData(
  primary: FundamentalData<EarningsReport> | null,
  fallback: FundamentalData<EarningsReport> | null,
): FundamentalData<EarningsReport> | null {
  if (!primary?.quarterly?.length) return fallback;
  if (!fallback?.quarterly?.length) return primary;

  const p0 = primary.quarterly[0]!;
  if (p0.reportedEPS != null) return primary;

  const fReported =
    fallback.quarterly.find((r) => r.reportedEPS != null) ?? null;
  if (!fReported) return primary;

  const priorF =
    fallback.quarterly.find(
      (r, i) => i > 0 && r.reportedEPS != null && r !== fReported,
    ) ?? null;

  const mergedFirst: EarningsReport = {
    fiscalDateEnding: p0.fiscalDateEnding || fReported.fiscalDateEnding,
    reportedEPS: fReported.reportedEPS,
    estimatedEPS: p0.estimatedEPS ?? fReported.estimatedEPS,
    surprise: p0.surprise ?? fReported.surprise,
    surprisePercentage: p0.surprisePercentage ?? fReported.surprisePercentage,
  };

  const quarterly = [mergedFirst, ...primary.quarterly.slice(1)];
  // Ensure YoY partner exists when Yahoo history lacked a usable prior EPS row.
  if (priorF && quarterly.length < 5) {
    while (quarterly.length < 4) {
      quarterly.push({
        fiscalDateEnding: "",
        reportedEPS: null,
        estimatedEPS: null,
        surprise: null,
        surprisePercentage: null,
      });
    }
    quarterly.push(priorF);
  }

  return { annual: primary.annual, quarterly };
}
