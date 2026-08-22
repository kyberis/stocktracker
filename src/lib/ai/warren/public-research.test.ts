import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/screening/data/tavily", () => ({
  fetchTavilySearch: vi.fn(),
}));
vi.mock("@/lib/screening/data/ir-site-docs", () => ({
  fetchIrSiteDocuments: vi.fn(),
}));
vi.mock("@/lib/screening/data/fmp-ir", () => ({
  fetchFmpIrBundle: vi.fn(),
}));

import { fetchTavilySearch } from "@/lib/screening/data/tavily";
import { fetchIrSiteDocuments } from "@/lib/screening/data/ir-site-docs";
import { fetchFmpIrBundle } from "@/lib/screening/data/fmp-ir";
import {
  sanitizeWarrenResearchQuery,
  sanitizeWarrenResearchTicker,
  warrenFetchEarningsContext,
  warrenFetchInvestorRelations,
  warrenSearchPublicWeb,
} from "./public-research";

const mockedSearch = vi.mocked(fetchTavilySearch);
const mockedIr = vi.mocked(fetchIrSiteDocuments);
const mockedFmp = vi.mocked(fetchFmpIrBundle);

describe("warren public research", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sanitizes tickers and queries", () => {
    expect(sanitizeWarrenResearchTicker(" flr ")).toBe("FLR");
    expect(sanitizeWarrenResearchTicker("FLR; drop")).toBeNull();
    expect(sanitizeWarrenResearchQuery("  Q2  guidance\n\x00  ")).toBe("Q2 guidance");
  });

  it("scopes web search with ticker and truncates snippets", async () => {
    mockedSearch.mockResolvedValue({
      results: [
        {
          title: "Fluor reports",
          url: "https://example.com/flr",
          content: "x".repeat(800),
          publishedDate: "2026-08-01",
          source: "example.com",
        },
      ],
      errors: [],
    });
    const out = await warrenSearchPublicWeb({ query: "ROE explanation", ticker: "FLR" });
    expect(mockedSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: "FLR ROE explanation" }),
    );
    expect(out.results[0]?.snippet.length).toBeLessThanOrEqual(500);
  });

  it("rejects empty queries", async () => {
    const out = await warrenSearchPublicWeb({ query: "  " });
    expect(out.errors).toContain("query_too_short");
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it("returns IR excerpts for a valid ticker", async () => {
    mockedIr.mockResolvedValue({
      ticker: "FLR",
      irPageUrl: "https://investor.fluor.com",
      documents: [
        {
          url: "https://investor.fluor.com/q2.pdf",
          title: "Q2 results",
          asOf: "2026-08-01",
          excerpt: "Backlog grew.",
          role: "document",
          format: "pdf",
        },
      ],
      hasUsefulContent: true,
      searchCredits: 0,
      extractCredits: 0,
      errors: [],
      provider: "tavily",
      serperQueries: 0,
      jinaUrls: 0,
      searchQueries: [],
      extractQueries: [],
      extractUrls: [],
      searchHits: [],
    });
    const out = await warrenFetchInvestorRelations({ ticker: "FLR", companyName: "Fluor" });
    expect(out.documents).toHaveLength(1);
    expect(out.irPageUrl).toContain("fluor");
  });

  it("combines transcript and web for earnings", async () => {
    mockedFmp.mockResolvedValue({
      ticker: "FLR",
      transcript: {
        year: 2026,
        quarter: 2,
        date: "2026-08-02",
        excerpt: "We remain focused on project execution.",
      },
      news: [],
      insiders: [],
      requestCount: 1,
      errors: [],
    });
    mockedSearch.mockResolvedValue({
      results: [
        {
          title: "FLR earnings recap",
          url: "https://example.com/earn",
          content: "Beat on revenue.",
          publishedDate: null,
          source: "example.com",
        },
      ],
      errors: [],
    });
    const out = await warrenFetchEarningsContext({ ticker: "flr" });
    expect(out.transcript?.quarter).toBe(2);
    expect(out.web).toHaveLength(1);
  });
});
