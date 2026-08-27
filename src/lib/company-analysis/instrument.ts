import { ETF_NAME_PATTERNS } from "@/lib/services/etf-lookthrough";

export type CompanyAnalysisInstrumentKind = "equity" | "etf";

const ETF_QUOTE_TYPE = /ETF|MUTUALFUND|ETN|ETP|INDEX/i;
const ETF_NAME_EXTRA = /\bETP\b|\bETC\b|\bCoinShares\b/i;

export function isEtfQuoteType(quoteType: string | null | undefined): boolean {
  return ETF_QUOTE_TYPE.test(String(quoteType ?? ""));
}

/** Yahoo quoteType, fund legal type, or name heuristics (UCITS / iShares / ETP). */
export function isEtfInstrument(input: {
  quoteType?: string | null;
  name?: string | null;
  legalType?: string | null;
}): boolean {
  if (isEtfQuoteType(input.quoteType)) return true;
  const blob = `${input.name ?? ""} ${input.legalType ?? ""}`;
  return ETF_NAME_PATTERNS.test(blob) || ETF_NAME_EXTRA.test(blob);
}

/**
 * Legacy day-cache equity payloads for funds (no instrumentKind). Skip so we
 * rebuild under `report:etf:` instead of serving EPS/insider chrome.
 */
export function isLegacyEquityCacheForEtf(report: {
  instrumentKind?: CompanyAnalysisInstrumentKind;
  quote?: { quoteType?: string | null } | null;
  profile?: { name?: string | null } | null;
}): boolean {
  if (report.instrumentKind === "etf" || report.instrumentKind === "equity") return false;
  return isEtfInstrument({
    quoteType: report.quote?.quoteType,
    name: report.profile?.name,
  });
}
