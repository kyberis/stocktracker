/**
 * Merge web/AI enrichment into fundamentals only when API fields are missing
 * and a citable source URL is present.
 */

import { sanitizeHttpUrl } from "./urls";
import type { CompanyAnalysisFundamentals, CompanyAnalysisSource } from "./types";

export interface WebNumericEnrichment {
  companyGuidanceRevenue?: number | null;
  companyGuidanceRevenueVarPct?: number | null;
  companyGuidanceSourceUrl?: string | null;
  lastEps?: number | null;
  lastEpsSourceUrl?: string | null;
  webSources?: Array<{ name?: string; url?: string }> | null;
  usedWeb?: boolean;
}

export function applyWebNumericEnrichment(
  fundamentals: CompanyAnalysisFundamentals,
  enrich: WebNumericEnrichment | null | undefined,
): CompanyAnalysisFundamentals {
  if (!enrich) return fundamentals;

  let companyGuidanceRevenue = fundamentals.companyGuidanceRevenue;
  let companyGuidanceRevenueVarPct = fundamentals.companyGuidanceRevenueVarPct;
  let companyGuidanceSourceUrl =
    (fundamentals as CompanyAnalysisFundamentals & { companyGuidanceSourceUrl?: string | null })
      .companyGuidanceSourceUrl ?? null;

  const guidanceUrl = sanitizeHttpUrl(enrich.companyGuidanceSourceUrl);
  if (
    companyGuidanceRevenue == null &&
    enrich.companyGuidanceRevenue != null &&
    Number.isFinite(enrich.companyGuidanceRevenue) &&
    guidanceUrl
  ) {
    companyGuidanceRevenue = enrich.companyGuidanceRevenue;
    companyGuidanceRevenueVarPct =
      enrich.companyGuidanceRevenueVarPct != null &&
      Number.isFinite(enrich.companyGuidanceRevenueVarPct)
        ? enrich.companyGuidanceRevenueVarPct
        : null;
    companyGuidanceSourceUrl = guidanceUrl;
  }

  let lastEps = fundamentals.lastEps;
  let lastEpsSourceUrl: string | null = null;
  const epsUrl = sanitizeHttpUrl(enrich.lastEpsSourceUrl);
  if (lastEps == null && enrich.lastEps != null && Number.isFinite(enrich.lastEps) && epsUrl) {
    lastEps = enrich.lastEps;
    lastEpsSourceUrl = epsUrl;
  }

  const rows = fundamentals.rows.map((row) => {
    if (row.label !== "eps") return row;
    if (row.value != null) return row;
    if (lastEps == null) return row;
    return { ...row, value: lastEps };
  });

  // If EPS row missing entirely but we have web EPS, prepend it.
  const hasEpsRow = rows.some((r) => r.label === "eps");
  if (!hasEpsRow && lastEps != null) {
    rows.unshift({
      label: "eps",
      value: lastEps,
      yoyPct: null,
      unit: "eps",
    });
  }

  return {
    ...fundamentals,
    rows,
    companyGuidanceRevenue,
    companyGuidanceRevenueVarPct,
    companyGuidanceSourceUrl,
    lastEps,
    lastEpsSourceUrl,
  } as CompanyAnalysisFundamentals;
}

export function collectWebSources(
  enrich: WebNumericEnrichment | null | undefined,
): CompanyAnalysisSource[] {
  if (!enrich?.webSources?.length) return [];
  const out: CompanyAnalysisSource[] = [];
  const seen = new Set<string>();
  for (const s of enrich.webSources) {
    const url = sanitizeHttpUrl(s.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ name: (s.name || "Web source").slice(0, 80), url });
  }
  return out;
}
