import type { CompanyAnalysisReport } from "./types";

/**
 * Strips the two sections backed by FMP's paid/restricted endpoints (insider
 * and congressional trading) from a report before it's sent to an anonymous
 * caller. The underlying cached report is left untouched — only the response
 * copy is redacted, so a later authenticated request for the same ticker
 * still gets the full cached data.
 */
export function redactPaidSections(report: CompanyAnalysisReport): CompanyAnalysisReport {
  return {
    ...report,
    insiders: { status: "locked", items: [] },
    congress: { status: "locked", items: [] },
  };
}
