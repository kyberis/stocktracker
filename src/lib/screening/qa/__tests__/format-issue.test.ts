import { describe, expect, it } from "vitest";
import { formatQaIssueForUser } from "@/lib/screening/qa/format-issue";
import type { QaIssue } from "@/lib/screening/schemas";

const now = new Date("2026-08-10T12:00:00.000Z");

describe("formatQaIssueForUser", () => {
  it("renders R6 future without rule codes (es)", () => {
    const issue: QaIssue = {
      issueType: "unconfirmed_source",
      ruleId: "R6",
      agentKind: "ir_business",
      ticker: "ZTS",
      claimPath: "guidance.asOf",
      expectedValue: "not in the future",
      actualValue: "2026-12-01",
      summary: "Esto constituye una violación de R6",
      blocking: true,
    };
    const text = formatQaIssueForUser(issue, "es", now);
    expect(text).toContain("2026-12-01");
    expect(text.toLowerCase()).toContain("posterior");
    expect(text).not.toMatch(/\bR6\b/);
    expect(text.toLowerCase()).not.toContain("violación");
  });

  it("renders R6 stale in English", () => {
    const issue: QaIssue = {
      issueType: "unconfirmed_source",
      ruleId: "R6",
      agentKind: "ir_business",
      ticker: "AAA",
      claimPath: "guidance.asOf",
      expectedValue: "within the last 12 months",
      actualValue: "2024-01-01",
      summary: "Guidance asOf 2024-01-01 is older than 12 months.",
      blocking: true,
    };
    const text = formatQaIssueForUser(issue, "en", now);
    expect(text).toContain("2024-01-01");
    expect(text.toLowerCase()).toContain("older than a year");
    expect(text).not.toMatch(/\bR6\b/);
  });
});
