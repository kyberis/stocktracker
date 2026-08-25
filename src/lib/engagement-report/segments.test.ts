import { describe, expect, it } from "vitest";
import { classifySegment, isPowerUser, daysSince, type UserActivityRow } from "./segments";
import { aggregateToolsByBucket, bucketForEvent } from "./tool-taxonomy";
import { aiReportOutputSchema } from "./generate";
import { renderEngagementReportHtml } from "./render-html";
import type { EngagementSnapshot } from "./snapshot";
import { SURVEY_TEMPLATES } from "./templates";

describe("engagement segments", () => {
  it("classifies by last event age", () => {
    const now = Date.parse("2026-08-25T12:00:00Z");
    expect(classifySegment(null, now)).toBe("never_active");
    expect(classifySegment("2026-08-24T12:00:00Z", now)).toBe("engaged");
    expect(classifySegment("2026-08-01T12:00:00Z", now)).toBe("warm");
    expect(classifySegment("2026-06-20T12:00:00Z", now)).toBe("dormant");
    expect(classifySegment("2026-01-01T12:00:00Z", now)).toBe("churned");
  });

  it("computes daysSince", () => {
    const now = Date.parse("2026-08-25T00:00:00Z");
    expect(daysSince("2026-08-20T00:00:00Z", now)).toBeCloseTo(5, 5);
    expect(daysSince(null, now)).toBeNull();
  });

  it("marks top engaged users as power", () => {
    const peers: UserActivityRow[] = Array.from({ length: 10 }, (_, i) => ({
      userId: `u${i}`,
      username: `user${i}`,
      email: `u${i}@ex.com`,
      plan: "free",
      lastEventAt: "2026-08-24T00:00:00Z",
      eventCountInWindow: i === 0 ? 100 : 5,
      distinctEventTypes: 3,
      createdAt: "2026-01-01T00:00:00Z",
    }));
    expect(isPowerUser(peers[0], peers)).toBe(true);
    expect(isPowerUser(peers[9], peers)).toBe(false);
  });
});

describe("tool taxonomy", () => {
  it("buckets known events", () => {
    expect(bucketForEvent("holding_add")).toBe("portfolio");
    expect(bucketForEvent("portfolio_import")).toBe("import");
    expect(bucketForEvent("warren_chat")).toBe("ai");
    expect(bucketForEvent("billing_checkout_started")).toBe("billing");
  });

  it("aggregates buckets", () => {
    const rows = aggregateToolsByBucket([
      { event: "holding_add", count: 10 },
      { event: "portfolio_import", count: 3 },
      { event: "login", count: 2 },
    ]);
    const portfolio = rows.find((r) => r.bucket === "portfolio");
    expect(portfolio?.count).toBe(10);
  });
});

describe("AI report schema", () => {
  it("accepts valid proposals", () => {
    const parsed = aiReportOutputSchema.safeParse({
      narrativeSections: [
        { title: "Overview", html: "<p>ok</p>" },
        { title: "Tools", html: "<p>ok</p>" },
      ],
      insights: ["a", "b"],
      recommendations: ["c", "d"],
      surveyProposals: [
        {
          templateId: "nps",
          title: "NPS",
          rationale: "pulse",
          targetUserIds: ["u1"],
          questionsEn: [{ id: "q1", type: "nps", prompt: "Score?" }],
          questionsEs: [{ id: "q1", type: "nps", prompt: "¿Puntuación?" }],
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown template", () => {
    const parsed = aiReportOutputSchema.safeParse({
      narrativeSections: [
        { title: "Overview", html: "<p>ok</p>" },
        { title: "Tools", html: "<p>ok</p>" },
      ],
      insights: ["a", "b"],
      recommendations: ["c", "d"],
      surveyProposals: [
        {
          templateId: "custom",
          title: "X",
          rationale: "y",
          targetUserIds: [],
          questionsEn: [{ id: "q1", type: "text", prompt: "Hi?" }],
          questionsEs: [{ id: "q1", type: "text", prompt: "¿Hola?" }],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("renderEngagementReportHtml", () => {
  it("includes KPIs and survey template label", () => {
    const snapshot: EngagementSnapshot = {
      generatedAt: "2026-08-25T00:00:00Z",
      periodDays: 30,
      totals: { totalUsers: 10, activeUsers7d: 3, activeUsers30d: 5, eventsInWindow: 100 },
      segments: {
        engaged: { count: 3, users: [] },
        warm: { count: 2, users: [] },
        dormant: { count: 1, users: [] },
        churned: { count: 1, users: [] },
        never_active: { count: 3, users: [] },
      },
      powerUsers: [],
      toolUsage: [{ bucket: "portfolio", label: "Portfolio", count: 40, topEvents: [] }],
      topEvents: [{ event: "login", count: 20 }],
      mcpTools: [],
      satisfaction: {
        submitted: 4,
        averageRating: 4.2,
        ratingDistribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2 },
        lowRaters: [],
        recentComments: [],
      },
      feedback: { open: 1, answered: 0, closed: 2, recent: [] },
      emailEligibleTargets: {
        winback: { userIds: [], emails: [], rationaleHint: "" },
        missing_tool: { userIds: [], emails: [], rationaleHint: "" },
        nps: { userIds: ["u1"], emails: ["a@b.com"], rationaleHint: "" },
      },
    };
    const html = renderEngagementReportHtml(
      snapshot,
      {
        narrativeSections: [{ title: "Overview", html: "<p>Story</p>" }],
        insights: ["i1", "i2"],
        recommendations: ["r1", "r2"],
        surveyProposals: [
          {
            templateId: "nps",
            title: "Pulse",
            rationale: "why",
            targetUserIds: ["u1"],
            questionsEn: [{ id: "q1", type: "nps", prompt: "Score?" }],
            questionsEs: [{ id: "q1", type: "nps", prompt: "¿Puntuación?" }],
          },
        ],
      },
      { model: "gpt-4.1-mini", usedFallback: true },
    );
    expect(html).toContain("Total users");
    expect(html).toContain(">10<");
    expect(html).toContain(SURVEY_TEMPLATES.nps.label);
    expect(html).toContain("Story");
    expect(html).toContain("fallback");
    expect(html).toContain("color-scheme: light only");
    expect(html).toContain("th, td");
    expect(html).toMatch(/th, td[^}]*color: #0f172a/);
  });
});
