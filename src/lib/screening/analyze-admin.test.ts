import { describe, expect, it } from "vitest";
import {
  compactIrDocuments,
  fillAnalyzeResourceGaps,
  mergeIrResources,
  parseAnalyzeBriefMeta,
  parseIrAgentOutputJson,
  parseIrStepCompletedPayload,
} from "@/lib/screening/analyze-admin";

describe("parseAnalyzeBriefMeta", () => {
  it("reads focus listing fields", () => {
    expect(
      parseAnalyzeBriefMeta(
        JSON.stringify({
          intent: "analyze",
          focusTicker: "uber",
          focusCompanyName: "Uber Technologies, Inc.",
          focusExchange: "NYQ",
        }),
      ),
    ).toEqual({
      ticker: "UBER",
      companyName: "Uber Technologies, Inc.",
      exchange: "NYQ",
    });
  });

  it("returns nulls on invalid JSON", () => {
    expect(parseAnalyzeBriefMeta("nope")).toEqual({
      ticker: null,
      companyName: null,
      exchange: null,
    });
  });
});

describe("compactIrDocuments", () => {
  it("keeps url, title, excerpt and drops empties", () => {
    expect(
      compactIrDocuments([
        {
          url: "https://investors.example.com/q2.pdf",
          title: "Q2 report",
          asOf: "2026-08-01",
          role: "document",
          format: "pdf",
          excerpt: "Revenue grew.",
        },
        { title: "no url" },
      ]),
    ).toEqual([
      {
        url: "https://investors.example.com/q2.pdf",
        title: "Q2 report",
        asOf: "2026-08-01",
        role: "document",
        format: "pdf",
        excerpt: "Revenue grew.",
      },
    ]);
  });
});

describe("parseIrStepCompletedPayload", () => {
  it("maps Serper/Jina IR payload including documents", () => {
    expect(
      parseIrStepCompletedPayload(
        JSON.stringify({
          irSiteDocsUsed: true,
          provider: "serper_jina",
          serperQueries: 2,
          jinaUrls: 3,
          irPageUrl: "https://investors.uber.com/",
          documents: [
            {
              url: "https://investors.uber.com/q2.pdf",
              title: "Q2",
              asOf: "2026-08-01",
              role: "document",
              format: "pdf",
              excerpt: "Trips up 18%.",
            },
          ],
          searchQueries: ["Uber UBER investor relations"],
          errors: [],
        }),
      ),
    ).toMatchObject({
      provider: "serper_jina",
      serperQueries: 2,
      jinaUrls: 3,
      irSiteDocsUsed: true,
      irPageUrl: "https://investors.uber.com/",
      documents: [
        expect.objectContaining({
          url: "https://investors.uber.com/q2.pdf",
          excerpt: "Trips up 18%.",
        }),
      ],
      searchQueries: ["Uber UBER investor relations"],
    });
  });

  it("ignores unknown providers", () => {
    expect(parseIrStepCompletedPayload(JSON.stringify({ provider: "firecrawl" })))
      .toMatchObject({ provider: null });
  });
});

describe("parseIrAgentOutputJson", () => {
  it("pulls guidance summary, bullets, and cited URLs", () => {
    expect(
      parseIrAgentOutputJson(
        JSON.stringify({
          bullets: ["Mobility mix shifted."],
          guidance: {
            summary: "Raised outlook.",
            sources: [{ url: "https://investors.uber.com/q2.pdf", label: "Q2", asOf: "2026-08-01" }],
          },
          catalysts: [
            {
              label: "Trips",
              evidence: "x",
              sources: [{ url: "https://investors.uber.com/news", label: "PR" }],
            },
          ],
        }),
      ),
    ).toMatchObject({
      guidanceSummary: "Raised outlook.",
      bullets: ["Mobility mix shifted."],
      llmSources: [
        expect.objectContaining({ url: "https://investors.uber.com/q2.pdf" }),
        expect.objectContaining({ url: "https://investors.uber.com/news" }),
      ],
    });
  });
});

describe("mergeIrResources", () => {
  it("sums counts and mixes providers", () => {
    expect(
      mergeIrResources([
        {
          provider: "serper_jina",
          serperQueries: 2,
          jinaUrls: 1,
          irSiteDocsUsed: true,
          irPageUrl: "https://investors.example.com/",
          documents: [
            {
              url: "https://investors.example.com/q2.pdf",
              title: "Q2",
              asOf: null,
              role: "document",
              format: "pdf",
              excerpt: "Hi",
            },
          ],
          searchQueries: ["Example EX investor relations"],
          extractQueries: [],
          extractUrls: ["https://investors.example.com/q2.pdf"],
          searchHits: [],
          errors: [],
          llmSources: [],
          guidanceSummary: null,
          bullets: [],
        },
        {
          provider: "tavily",
          serperQueries: 0,
          jinaUrls: 0,
          irSiteDocsUsed: false,
          irPageUrl: null,
          documents: [],
          searchQueries: [],
          extractQueries: [],
          extractUrls: [],
          searchHits: [],
          errors: [],
          llmSources: [],
          guidanceSummary: null,
          bullets: [],
        },
      ]),
    ).toMatchObject({
      provider: "mixed",
      serperQueries: 2,
      jinaUrls: 1,
      irSiteDocsUsed: true,
      irPageUrl: "https://investors.example.com/",
      documents: [expect.objectContaining({ url: "https://investors.example.com/q2.pdf" })],
    });
  });
});

describe("fillAnalyzeResourceGaps", () => {
  it("reconstructs search and extract queries for old runs with only credit counts", () => {
    const filled = fillAnalyzeResourceGaps(
      {
        provider: "mixed",
        serperQueries: 2,
        jinaUrls: 0,
        irSiteDocsUsed: true,
        irPageUrl: null,
        documents: [],
        searchQueries: [],
        extractQueries: [],
        extractUrls: [],
        searchHits: [],
        errors: [],
        llmSources: [
          { url: "https://investors.uber.com/q2.pdf", label: "Q2", asOf: "2026-08-01" },
        ],
        guidanceSummary: null,
        bullets: [],
      },
      { ticker: "UBER", companyName: "Uber Technologies, Inc.", exchange: "NYQ" },
      { tavilySearchCredits: 4, tavilyExtractCredits: 1 },
    );
    expect(filled.searchQueries.some((q) => q.includes("investor relations"))).toBe(true);
    expect(filled.extractQueries.length).toBeGreaterThan(0);
    expect(filled.documents[0]?.url).toContain("investors.uber.com");
    expect(filled.extractUrls).toContain("https://investors.uber.com/q2.pdf");
  });
});
