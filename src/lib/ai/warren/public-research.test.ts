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
          excerpt:
            "Backlog grew in the quarter as Fluor booked several new infrastructure awards and restated full-year guidance.",
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
    expect(mockedIr).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: "FLR", companyName: "Fluor" }),
    );
    expect(out.documents).toHaveLength(1);
    expect(out.irPageUrl).toContain("fluor");
    expect(out.fallback).toBe("none");
  });

  it("searches Novo via NVO / Novo Nordisk and falls back to web when IR is empty", async () => {
    mockedIr.mockResolvedValue({
      ticker: "NVO",
      irPageUrl: null,
      documents: [],
      hasUsefulContent: false,
      searchCredits: 0,
      extractCredits: 0,
      errors: ["no_ir_candidates"],
      provider: null,
      serperQueries: 0,
      jinaUrls: 0,
      searchQueries: [],
      extractQueries: [],
      extractUrls: [],
      searchHits: [],
    });
    mockedFmp.mockResolvedValue({
      ticker: "NVO",
      transcript: {
        year: 2026,
        quarter: 1,
        date: "2026-05-01",
        excerpt: "Obesity franchise growth continued.",
      },
      news: [],
      insiders: [],
      requestCount: 1,
      errors: [],
    });
    mockedSearch.mockResolvedValue({
      results: [
        {
          title: "Novo Q1",
          url: "https://investors.novonordisk.com/q1",
          content: "Sales grew in GLP-1.",
          publishedDate: "2026-05-02",
          source: "novonordisk.com",
        },
      ],
      errors: [],
    });

    const out = await warrenFetchInvestorRelations({ ticker: "NOVO-B.CO" });
    expect(mockedIr).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: "NVO", companyName: "Novo Nordisk" }),
    );
    expect(mockedFmp).toHaveBeenCalledWith({ ticker: "NVO" });
    expect(mockedSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining("Novo Nordisk NVO"),
      }),
    );
    expect(out.documents).toHaveLength(0);
    expect(out.fallback).toBe("web_earnings");
    expect(out.web).toHaveLength(1);
    expect(out.transcript?.excerpt).toContain("Obesity");
    expect(out.errors).toContain("ir_empty_used_web_fallback");
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
