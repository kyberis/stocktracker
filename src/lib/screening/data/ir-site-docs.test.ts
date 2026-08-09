import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPdfOrBinaryUrl,
  isBlockedIrHost,
  pickIrUrls,
  scoreIrCandidate,
  fetchIrSiteDocuments,
} from "@/lib/screening/data/ir-site-docs";
import { tavilyExtractCreditsForUrls } from "@/lib/screening/cost";

describe("IR URL filters", () => {
  it("skips PDFs and binary links", () => {
    expect(isPdfOrBinaryUrl("https://investors.example.com/q1.pdf")).toBe(true);
    expect(
      isPdfOrBinaryUrl("https://investors.example.com/docs/pdf/q1-release"),
    ).toBe(true);
    expect(
      isPdfOrBinaryUrl("https://investors.example.com/news/q1-results"),
    ).toBe(false);
  });

  it("blocks social / amp hosts", () => {
    expect(isBlockedIrHost("https://www.reddit.com/r/stocks/tfii")).toBe(true);
    expect(
      isBlockedIrHost("https://seekingalpha.com/amp/article/123"),
    ).toBe(true);
    expect(isBlockedIrHost("https://investors.tfiintl.com/")).toBe(false);
  });

  it("scores IR hub and earnings pages higher", () => {
    const hub = scoreIrCandidate({
      url: "https://investors.tfiintl.com/",
      title: "TFI International Investor Relations",
      companyName: "TFI International",
      ticker: "TFII",
      preferHub: true,
    });
    const news = scoreIrCandidate({
      url: "https://finance.yahoo.com/quote/TFII",
      title: "TFII quote",
      companyName: "TFI International",
      ticker: "TFII",
      preferHub: true,
    });
    expect(hub).toBeGreaterThan(news);
    expect(hub).toBeGreaterThan(0);
  });
});

describe("pickIrUrls", () => {
  it("prefers IR hub, skips PDFs, caps at 3", () => {
    const { irPageUrl, candidates } = pickIrUrls({
      ticker: "TFII",
      companyName: "TFI International",
      maxDocuments: 3,
      hubResults: [
        {
          title: "Yahoo TFII",
          url: "https://finance.yahoo.com/quote/TFII",
          content: "",
          publishedDate: null,
          source: "yahoo.com",
        },
        {
          title: "TFI Investor Relations",
          url: "https://investors.tfiintl.com/",
          content: "",
          publishedDate: null,
          source: "investors.tfiintl.com",
        },
      ],
      docResults: [
        {
          title: "Q1 Results PDF",
          url: "https://investors.tfiintl.com/q1.pdf",
          content: "",
          publishedDate: "2026-04-01",
          source: "investors.tfiintl.com",
        },
        {
          title: "TFI reports Q1 2026 earnings",
          url: "https://investors.tfiintl.com/news/q1-2026-results",
          content: "",
          publishedDate: "2026-04-24",
          source: "investors.tfiintl.com",
        },
        {
          title: "TFI Q4 earnings release",
          url: "https://investors.tfiintl.com/news/q4-2025-results",
          content: "",
          publishedDate: "2026-02-01",
          source: "investors.tfiintl.com",
        },
        {
          title: "Extra release",
          url: "https://investors.tfiintl.com/news/extra",
          content: "",
          publishedDate: "2026-01-01",
          source: "investors.tfiintl.com",
        },
      ],
    });

    expect(irPageUrl).toBe("https://investors.tfiintl.com/");
    expect(candidates.map((c) => c.url)).not.toContain(
      "https://investors.tfiintl.com/q1.pdf",
    );
    expect(candidates).toHaveLength(3);
    expect(candidates[0]?.role).toBe("ir_hub");
    expect(candidates.some((c) => c.url.includes("q1-2026-results"))).toBe(
      true,
    );
  });
});

describe("tavilyExtractCreditsForUrls", () => {
  it("ceil-prices basic and advanced extract", () => {
    expect(tavilyExtractCreditsForUrls(0)).toBe(0);
    expect(tavilyExtractCreditsForUrls(1, "basic")).toBe(1);
    expect(tavilyExtractCreditsForUrls(5, "basic")).toBe(1);
    expect(tavilyExtractCreditsForUrls(6, "basic")).toBe(2);
    expect(tavilyExtractCreditsForUrls(3, "advanced")).toBe(2);
  });
});

describe("fetchIrSiteDocuments", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TAVILY_API_KEY;
  });

  it("searches hub + docs, extracts HTML, reports useful content", async () => {
    process.env.TAVILY_API_KEY = "test-key";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (url.includes("/search")) {
        const q = String(body.query || "");
        if (q.includes("investor relations") && !q.includes("earnings")) {
          return new Response(
            JSON.stringify({
              results: [
                {
                  title: "TFI Investor Relations",
                  url: "https://investors.tfiintl.com/",
                  content: "IR hub",
                },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            results: [
              {
                title: "TFI Q1 2026 earnings",
                url: "https://investors.tfiintl.com/news/q1-2026",
                content: "earnings",
                published_date: "2026-04-24",
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("/extract")) {
        return new Response(
          JSON.stringify({
            results: (body.urls as string[]).map((u: string) => ({
              url: u,
              raw_content:
                "Management raised full-year guidance. Segments: Package and Courier, Less-Than-Truckload. ".repeat(
                  3,
                ),
            })),
            failed_results: [],
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    });

    const result = await fetchIrSiteDocuments({
      ticker: "TFII",
      companyName: "TFI International",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.hasUsefulContent).toBe(true);
    expect(result.irPageUrl).toBe("https://investors.tfiintl.com/");
    expect(result.documents.length).toBeGreaterThanOrEqual(1);
    expect(result.documents[0]?.excerpt.length).toBeGreaterThan(120);
    expect(fetchImpl).toHaveBeenCalled();
    const extractCalls = fetchImpl.mock.calls.filter((c) =>
      String(c[0]).includes("/extract"),
    );
    expect(extractCalls.length).toBeGreaterThanOrEqual(1);
  });
});
