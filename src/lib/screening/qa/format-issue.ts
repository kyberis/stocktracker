import { fill, getScreeningCopy } from "@/lib/screening/copy";
import { classifyGuidanceAsOf } from "@/lib/screening/qa/guidance-asof";
import type { QaIssue } from "@/lib/screening/schemas";

/** Soften raw agent prose before showing it as a fallback. */
export function softenQaIssueSummary(summary: string): string {
  return summary
    .replace(/\bR\d+\b/gi, "")
    .replace(/\basOf\b/gi, "date")
    .replace(/\bviolaci[oó]n(?:es)?\b/gi, "nota")
    .replace(/\bviolation(?:s)?\b/gi, "note")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s·,:;—-]+/, "")
    .trim();
}

function inferR6Kind(
  issue: QaIssue,
  now: Date,
): "stale" | "future" | "unparseable" | "generic" {
  const expected = (issue.expectedValue ?? "").toLowerCase();
  if (expected.includes("parseable")) return "unparseable";
  if (expected.includes("12 months") || expected.includes("last 12")) {
    return "stale";
  }
  if (expected.includes("future")) return "future";

  const asOf = issue.actualValue?.trim();
  if (asOf) {
    const freshness = classifyGuidanceAsOf(asOf, now);
    if (freshness === "stale") return "stale";
    if (freshness === "future") return "future";
    if (freshness === "unparseable") return "unparseable";
  }

  const s = (issue.summary ?? "").toLowerCase();
  if (
    s.includes("older than") ||
    s.includes("más de 12") ||
    s.includes("antigua") ||
    s.includes("stale")
  ) {
    return "stale";
  }
  if (s.includes("future") || s.includes("futur")) return "future";
  if (s.includes("parseable") || s.includes("no se pudo leer")) {
    return "unparseable";
  }
  return "generic";
}

/**
 * User-facing one-liner for a QA issue (no internal rule codes).
 */
export function formatQaIssueForUser(
  issue: QaIssue,
  locale: string,
  now: Date = new Date(),
): string {
  const copy = getScreeningCopy(locale).report;
  const date = (issue.actualValue ?? "").trim() || "—";

  if (issue.ruleId === "R6") {
    const kind = inferR6Kind(issue, now);
    if (kind === "stale") {
      return fill(copy.verificationIssueR6Stale, { date });
    }
    if (kind === "future") {
      return fill(copy.verificationIssueR6Future, { date });
    }
    if (kind === "unparseable") {
      return fill(copy.verificationIssueR6Unparseable, { date });
    }
    return fill(copy.verificationIssueR6Generic, { date });
  }

  if (issue.ruleId) {
    const byRule = copy.verificationIssueByRule[issue.ruleId];
    if (byRule) {
      const detail = softenQaIssueSummary(issue.summary).slice(0, 220);
      return detail
        ? fill(byRule, { detail })
        : byRule.replace(/\s*:\s*\{detail\}\s*$/, "").trim();
    }
  }

  const typeLabel =
    copy.verificationIssueTypes[issue.issueType] ??
    copy.verificationIssueTypes.other;
  const detail = softenQaIssueSummary(issue.summary).slice(0, 280);
  if (!detail) return typeLabel;
  return fill(copy.verificationIssueGeneric, { type: typeLabel, detail });
}
