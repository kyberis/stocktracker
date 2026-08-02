/**
 * Detect incomplete company-analysis sections and merge fills without
 * wiping fields that are already good.
 */

import type { CompanyAnalysisReport } from "./types";

export type ReportGap =
  | "core"
  | "earnings"
  | "nextQuarter"
  | "news"
  | "insiders"
  | "congress"
  | "alternative";

const NARRATIVE_TEXT_KEYS = [
  "description",
  "competitive",
  "sectorOutlook",
  "risks",
  "technicalReading",
  "insiderReading",
] as const;

export type NarrativeTextKey = (typeof NARRATIVE_TEXT_KEYS)[number];

export function findReportGaps(report: CompanyAnalysisReport): ReportGap[] {
  const gaps: ReportGap[] = [];
  if (!report.quote && !report.profile) gaps.push("core");
  if (report.fundamentals.status === "unavailable") gaps.push("core");
  if (report.fundamentals.lastEps == null) gaps.push("earnings");
  if (
    report.fundamentals.consensusEps == null &&
    report.fundamentals.consensusRevenue == null &&
    report.fundamentals.nextReportDate == null
  ) {
    gaps.push("nextQuarter");
  }
  if (report.news.status === "unavailable") gaps.push("news");
  if (report.insiders.status === "unavailable") gaps.push("insiders");
  if (report.congress.status === "unavailable") gaps.push("congress");
  if (report.alternative.status === "unavailable") gaps.push("alternative");
  return gaps;
}

export function mergeReportFill(
  base: CompanyAnalysisReport,
  fill: CompanyAnalysisReport,
): CompanyAnalysisReport {
  const fundamentals =
    base.fundamentals.status === "unavailable" && fill.fundamentals.status === "ok"
      ? fill.fundamentals
      : {
          ...base.fundamentals,
          lastEps: base.fundamentals.lastEps ?? fill.fundamentals.lastEps,
          lastEpsVsConsensusPct:
            base.fundamentals.lastEpsVsConsensusPct ??
            fill.fundamentals.lastEpsVsConsensusPct,
          lastEpsSourceUrl:
            base.fundamentals.lastEpsSourceUrl ?? fill.fundamentals.lastEpsSourceUrl,
          consensusEps: base.fundamentals.consensusEps ?? fill.fundamentals.consensusEps,
          consensusRevenue:
            base.fundamentals.consensusRevenue ?? fill.fundamentals.consensusRevenue,
          consensusEpsVarPct:
            base.fundamentals.consensusEpsVarPct ?? fill.fundamentals.consensusEpsVarPct,
          consensusRevenueVarPct:
            base.fundamentals.consensusRevenueVarPct ??
            fill.fundamentals.consensusRevenueVarPct,
          nextReportDate:
            base.fundamentals.nextReportDate ?? fill.fundamentals.nextReportDate,
          nextQuarterLabel:
            base.fundamentals.nextQuarterLabel ?? fill.fundamentals.nextQuarterLabel,
          companyGuidanceRevenue:
            base.fundamentals.companyGuidanceRevenue ??
            fill.fundamentals.companyGuidanceRevenue,
          companyGuidanceRevenueVarPct:
            base.fundamentals.companyGuidanceRevenueVarPct ??
            fill.fundamentals.companyGuidanceRevenueVarPct,
          companyGuidanceSourceUrl:
            base.fundamentals.companyGuidanceSourceUrl ??
            fill.fundamentals.companyGuidanceSourceUrl,
          rows:
            base.fundamentals.rows.length > 0
              ? base.fundamentals.rows.map((row) => {
                  if (row.label !== "eps" || row.value != null) return row;
                  const fillEps = fill.fundamentals.rows.find((r) => r.label === "eps");
                  return fillEps?.value != null ? { ...row, value: fillEps.value, yoyPct: fillEps.yoyPct ?? row.yoyPct } : row;
                })
              : fill.fundamentals.rows,
        };

  const news =
    base.news.status === "unavailable" && fill.news.status === "ok"
      ? fill.news
      : base.news;
  const insiders =
    base.insiders.status === "unavailable" && fill.insiders.status === "ok"
      ? fill.insiders
      : base.insiders;
  const congress =
    base.congress.status === "unavailable" && fill.congress.status === "ok"
      ? fill.congress
      : base.congress;
  const alternative =
    base.alternative.status === "unavailable" && fill.alternative.status === "ok"
      ? fill.alternative
      : base.alternative;

  const sourceUrls = new Set(base.sources.map((s) => s.url));
  const sources = [...base.sources];
  for (const s of fill.sources) {
    if (sourceUrls.has(s.url)) continue;
    sourceUrls.add(s.url);
    sources.push(s);
  }

  return {
    ...base,
    quote: base.quote ?? fill.quote,
    profile: base.profile ?? fill.profile,
    fundamentals,
    technicals:
      base.technicals.status === "unavailable" && fill.technicals.status === "ok"
        ? fill.technicals
        : base.technicals,
    news,
    insiders,
    congress,
    alternative,
    sources,
    // Keep original generation timestamp; only mark as refreshed via updatedAt if caller sets it.
  };
}

export function findNarrativeGaps(
  narrative: Record<string, unknown>,
  opts?: { needLastEps?: boolean; needGuidance?: boolean },
): string[] {
  const gaps: string[] = [];
  for (const key of NARRATIVE_TEXT_KEYS) {
    const v = narrative[key];
    if (typeof v !== "string" || !v.trim()) gaps.push(key);
  }
  if (opts?.needLastEps) {
    if (narrative.lastEps == null || !narrative.lastEpsSourceUrl) gaps.push("lastEps");
  }
  if (opts?.needGuidance) {
    if (
      narrative.companyGuidanceRevenue == null ||
      !narrative.companyGuidanceSourceUrl
    ) {
      gaps.push("companyGuidanceRevenue");
    }
  }
  return gaps;
}

export function mergeNarrativeFill<T extends Record<string, unknown>>(
  base: T,
  fill: T,
): T {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(fill)) {
    if (v == null) continue;
    if (typeof v === "string" && !v.trim()) continue;
    const cur = out[k];
    if (cur == null || (typeof cur === "string" && !cur.trim())) {
      out[k] = v;
    }
  }
  if (Array.isArray(fill.webSources) && fill.webSources.length) {
    const seen = new Set(
      (Array.isArray(base.webSources) ? base.webSources : [])
        .map((s: { url?: string }) => s?.url)
        .filter(Boolean),
    );
    const merged = [
      ...(Array.isArray(base.webSources) ? base.webSources : []),
    ];
    for (const s of fill.webSources as Array<{ url?: string }>) {
      if (!s?.url || seen.has(s.url)) continue;
      seen.add(s.url);
      merged.push(s);
    }
    out.webSources = merged;
  }
  if (fill.usedWeb) out.usedWeb = true;
  return out as T;
}

/** Durable report/narrative cache TTL — rebuilds on next visit after expiry. */
export const DAY_MS = 24 * 60 * 60 * 1000;
/** @deprecated Use DAY_MS — kept as alias for older imports. */
export const WEEK_MS = DAY_MS;
/** Don't burn AI on permanently empty guidance more than once per day. */
export const NARRATIVE_GAP_RETRY_MS = 24 * 60 * 60 * 1000;

export function shouldRetryNarrativeGaps(
  lastGapRetryAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!lastGapRetryAt) return true;
  const t = Date.parse(lastGapRetryAt);
  if (Number.isNaN(t)) return true;
  return now - t >= NARRATIVE_GAP_RETRY_MS;
}
