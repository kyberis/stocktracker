import { describe, expect, it } from "vitest";

import type {
  ScreeningAgentOutputRow,
  ScreeningRunRow,
} from "@/lib/db/screening";
import { emptyScreeningCostBreakdown } from "@/lib/screening/cost";
import { composeScreeningReport } from "./build-report";

function runRow(): ScreeningRunRow {
  return {
    id: "run-1",
    userId: "user-1",
    status: "completed",
    intent: "analyze",
    briefJson: JSON.stringify({
      intent: "analyze",
      locale: "en",
      candidateCount: 1,
      focusTicker: "NKE",
      focusExchange: "NYSE",
      focusCompanyName: "Nike",
    }),
    mockedPipeline: false,
    costUsd: 0,
    costJson: "",
    costBreakdown: emptyScreeningCostBreakdown(),
    createdAt: "2026-08-09T00:00:00.000Z",
    updatedAt: "2026-08-09T00:00:00.000Z",
  };
}

function agentRow(kind: string, output: unknown): ScreeningAgentOutputRow {
  return {
    id: `${kind}-1`,
    runId: "run-1",
    userId: "user-1",
    agentKind: kind,
    ticker: null,
    agentIndex: null,
    outputJson: JSON.stringify(output),
    latencyMs: 1,
    createdAt: "2026-08-09T00:00:00.000Z",
  };
}

describe("composeScreeningReport degraded survivors", () => {
  it("keeps the only candidate when QA marks it degraded", () => {
    const report = composeScreeningReport({
      run: runRow(),
      hardDataRow: agentRow("hard_data", {
        status: "ok",
        universeSize: 1,
        candidates: [
          {
            ticker: "NKE",
            name: "Nike",
            sector: "Consumer Cyclical",
            industry: null,
            country: "US",
            marketCapUsd: 1e11,
            price: 75,
            rankScore: 70,
            rankReason: "Focus ticker for analyze",
          },
        ],
        deferredTickers: [],
        gaps: [],
        locale: "en",
        sources: [],
      }),
      compilerRow: agentRow("compiler", {
        summary: "Nike analysis summary.",
        candidateBullets: [
          {
            ticker: "NKE",
            headline: "Nike focus name",
            bullet: "Single-name analyze draft.",
          },
        ],
        disclaimer: "Not advice.",
        locale: "en",
      }),
      qaRow: agentRow("qa", {
        verdict: "pass_with_degradation",
        roundNumber: 3,
        issues: [
          {
            issueType: "unconfirmed_source",
            ruleId: null,
            agentKind: "web_sentiment",
            ticker: "NKE",
            claimPath: "sentiment",
            expectedValue: null,
            actualValue: null,
            summary: "Could not confirm a web claim",
            blocking: true,
          },
        ],
        flaggedAgentKinds: ["web_sentiment"],
        degradedTickers: ["NKE"],
        generatedAt: "2026-08-09T00:00:00.000Z",
      }),
    });

    expect(report).not.toBeNull();
    expect(report!.cards).toHaveLength(1);
    expect(report!.cards[0]!.ticker).toBe("NKE");
    expect(report!.cards[0]!.qa?.verified).toBe(false);
    expect(report!.verification?.verdict).toBe("pass_with_degradation");
    expect(report!.verification?.degradedTickers).toEqual(["NKE"]);
    // Headline rating removed — categories are always present.
    expect(report!.cards[0]!.score).toBeNull();
    expect(report!.cards[0]!.verdict).toBeNull();
    expect(report!.cards[0]!.categories).toBeDefined();
    expect(report!.comparisonRows[0]!.cheapLabel).toBeTruthy();
  });

  it("still drops degraded names when a clean candidate remains", () => {
    const report = composeScreeningReport({
      run: {
        ...runRow(),
        intent: "explore",
        briefJson: JSON.stringify({
          intent: "explore",
          locale: "en",
          candidateCount: 2,
        }),
      },
      hardDataRow: agentRow("hard_data", {
        status: "ok",
        universeSize: 2,
        candidates: [
          {
            ticker: "AAPL",
            name: "Apple",
            sector: "Technology",
            industry: null,
            country: "US",
            marketCapUsd: 2e12,
            price: 200,
            rankScore: 80,
            rankReason: "Clean candidate",
          },
          {
            ticker: "NKE",
            name: "Nike",
            sector: "Consumer Cyclical",
            industry: null,
            country: "US",
            marketCapUsd: 1e11,
            price: 75,
            rankScore: 70,
            rankReason: "Degraded candidate",
          },
        ],
        deferredTickers: [],
        gaps: [],
        locale: "en",
        sources: [],
      }),
      compilerRow: agentRow("compiler", {
        summary: "Two-name draft.",
        candidateBullets: [
          {
            ticker: "AAPL",
            headline: "Apple",
            bullet: "Clean.",
          },
          {
            ticker: "NKE",
            headline: "Nike",
            bullet: "Degraded.",
          },
        ],
        disclaimer: "Not advice.",
        locale: "en",
      }),
      qaRow: agentRow("qa", {
        verdict: "pass_with_degradation",
        roundNumber: 2,
        issues: [
          {
            issueType: "unconfirmed_source",
            ruleId: null,
            agentKind: "web_sentiment",
            ticker: "NKE",
            claimPath: "sentiment",
            expectedValue: null,
            actualValue: null,
            summary: "Could not confirm a web claim",
            blocking: true,
          },
        ],
        flaggedAgentKinds: ["web_sentiment"],
        degradedTickers: ["NKE"],
        generatedAt: "2026-08-09T00:00:00.000Z",
      }),
    });

    expect(report).not.toBeNull();
    expect(report!.cards.map((c) => c.ticker)).toEqual(["AAPL"]);
  });
});
