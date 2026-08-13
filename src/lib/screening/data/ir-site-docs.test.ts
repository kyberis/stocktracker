import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPdfOrBinaryUrl,
  isPdfUrl,
  isUnsupportedBinaryUrl,
  isBlockedIrHost,
  pickIrUrls,
  scoreIrCandidate,
  fetchIrSiteDocuments,
} from "@/lib/screening/data/ir-site-docs";
import { tavilyExtractCreditsForUrls } from "@/lib/screening/cost";

describe("IR URL filters", () => {
  it("detects PDFs and still skips office/archive binaries", () => {
    expect(isPdfUrl("https://investors.example.com/q1.pdf")).toBe(true);
    expect(isPdfUrl("https://investors.example.com/docs/pdf/q1-release")).toBe(
      true,
    );
    expect(isPdfUrl("https://investors.example.com/news/q1-results")).toBe(
      false,
    );
    expect(isUnsupportedBinaryUrl("https://investors.example.com/q1.pptx")).toBe(
      true,
    );
    expect(isPdfOrBinaryUrl("https://investors.example.com/q1.pdf")).toBe(true);
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
  it("prefers HTML IR hub, keeps earnings PDFs, caps at 3", () => {
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
    expect(candidates.map((c) => c.url)).toContain(
      "https://investors.tfiintl.com/q1.pdf",
    );
    expect(candidates).toHaveLength(3);
    expect(candidates[0]?.role).toBe("ir_hub");
    expect(candidates[0]?.url).toBe("https://investors.tfiintl.com/");
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
    delete process.env.SERPER_API_KEY;
    delete process.env.JINA_API_KEY;
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

  it("extracts IR PDFs with advanced depth and no query chunks", async () => {
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
                  title: "CSI Investor Relations",
                  url: "https://www.csisoftware.com/investor-relations/",
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
                title: "Q1 2026 Shareholder Report",
                url: "https://www.csisoftware.com/wp-content/uploads/2026/05/Q1-2026-Shareholder-Report.pdf",
                content: "pdf",
                published_date: "2026-05-12",
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
              raw_content: "Revenue grew. Management reiterated the acquisition flywheel. ".repeat(8),
            })),
            failed_results: [],
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    });

    const result = await fetchIrSiteDocuments({
      ticker: "CSU.TO",
      companyName: "Constellation Software Inc.",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.hasUsefulContent).toBe(true);
    const pdfDoc = result.documents.find((d) => d.format === "pdf");
    expect(pdfDoc).toBeTruthy();
    expect(pdfDoc?.url).toContain(".pdf");

    const extractBodies = fetchImpl.mock.calls
      .filter((c) => String(c[0]).includes("/extract"))
      .map((c) => JSON.parse(String(c[1]?.body ?? "{}")));
    const pdfExtract = extractBodies.find((b) =>
      (b.urls as string[]).some((u: string) => u.endsWith(".pdf")),
    );
    expect(pdfExtract?.extract_depth).toBe("advanced");
    expect(pdfExtract?.query).toBeUndefined();
    expect(result.provider).toBe("tavily");
  });

  it("uses Serper + Jina when preferSerperJina and keys are set", async () => {
    process.env.SERPER_API_KEY = "serper-test";
    process.env.JINA_API_KEY = "jina-test";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (url.includes("google.serper.dev")) {
        const q = String(body.q || "");
        if (q.includes("investor relations") && !q.includes("earnings")) {
          return new Response(
            JSON.stringify({
              organic: [
                {
                  title: "CSI Investor Relations",
                  link: "https://www.csisoftware.com/investor-relations/",
                  snippet: "IR hub",
                },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            organic: [
              {
                title: "Q2 2026 Shareholder Report",
                link: "https://www.csisoftware.com/q2-2026.pdf",
                snippet: "pdf",
                date: "2026-08-11",
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("eu.r.jina.ai")) {
        return new Response(
          JSON.stringify({
            data: {
              content:
                "Management reiterated the acquisition flywheel and raised organic growth. ".repeat(
                  4,
                ),
            },
          }),
          { status: 200 },
        );
      }
      return new Response("unexpected tavily", { status: 500 });
    });

    const result = await fetchIrSiteDocuments({
      ticker: "CSU.TO",
      companyName: "Constellation Software Inc.",
      preferSerperJina: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.hasUsefulContent).toBe(true);
    expect(result.provider).toBe("serper_jina");
    expect(result.serperQueries).toBe(2);
    expect(result.jinaUrls).toBeGreaterThanOrEqual(1);
    expect(result.searchCredits).toBe(0);
    expect(result.extractCredits).toBe(0);
    expect(result.documents.some((d) => d.format === "pdf")).toBe(true);
    expect(
      fetchImpl.mock.calls.some((c) => String(c[0]).includes("tavily.com")),
    ).toBe(false);
  });

  it("falls back to Tavily extract for a URL Jina fails", async () => {
    process.env.SERPER_API_KEY = "serper-test";
    process.env.JINA_API_KEY = "jina-test";
    process.env.TAVILY_API_KEY = "tavily-test";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (url.includes("google.serper.dev")) {
        const q = String(body.q || "");
        if (q.includes("investor relations") && !q.includes("earnings")) {
          return new Response(
            JSON.stringify({
              organic: [
                {
                  title: "TFI Investor Relations",
                  link: "https://investors.tfiintl.com/",
                  snippet: "IR hub",
                },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            organic: [
              {
                title: "TFI Q1 2026 earnings",
                link: "https://investors.tfiintl.com/news/q1-2026",
                snippet: "earnings",
                date: "2026-04-24",
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("eu.r.jina.ai")) {
        return new Response("jina down", { status: 502 });
      }
      if (url.includes("/extract")) {
        return new Response(
          JSON.stringify({
            results: (body.urls as string[]).map((u: string) => ({
              url: u,
              raw_content:
                "Management raised full-year guidance. Segments: Package and Courier. ".repeat(
                  4,
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
      preferSerperJina: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.hasUsefulContent).toBe(true);
    expect(result.provider).toBe("mixed");
    expect(result.extractCredits).toBeGreaterThan(0);
    expect(
      fetchImpl.mock.calls.some((c) => String(c[0]).includes("/extract")),
    ).toBe(true);
  });

  it("falls back to Tavily search when Serper returns empty", async () => {
    process.env.SERPER_API_KEY = "serper-test";
    process.env.JINA_API_KEY = "jina-test";
    process.env.TAVILY_API_KEY = "tavily-test";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (url.includes("google.serper.dev")) {
        return new Response(JSON.stringify({ organic: [] }), { status: 200 });
      }
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
                "Management raised full-year guidance. Segments: Package and Courier. ".repeat(
                  4,
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
      preferSerperJina: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.hasUsefulContent).toBe(true);
    expect(result.provider).toBe("tavily");
    expect(result.serperQueries).toBe(2);
    expect(result.searchCredits).toBe(2);
  });

  it("forceSerperJina skips Tavily even when Serper returns no IR-scored hits", async () => {
    process.env.SERPER_API_KEY = "serper-test";
    process.env.JINA_API_KEY = "jina-test";
    process.env.TAVILY_API_KEY = "tavily-test";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("google.serper.dev")) {
        return new Response(
          JSON.stringify({
            organic: [
              {
                title: "UBER quote",
                link: "https://finance.yahoo.com/quote/UBER",
                snippet: "quote",
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("eu.r.jina.ai")) {
        return new Response(
          JSON.stringify({
            data: {
              content:
                "Uber mobility and delivery segments. Management reiterated bookings growth. ".repeat(
                  4,
                ),
            },
          }),
          { status: 200 },
        );
      }
      return new Response("unexpected tavily", { status: 500 });
    });

    const result = await fetchIrSiteDocuments({
      ticker: "UBER",
      companyName: "Uber Technologies, Inc.",
      preferSerperJina: true,
      forceSerperJina: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.provider).toBe("serper_jina");
    expect(result.jinaUrls).toBeGreaterThanOrEqual(1);
    expect(result.searchCredits).toBe(0);
    expect(result.extractCredits).toBe(0);
    expect(
      fetchImpl.mock.calls.some((c) => String(c[0]).includes("tavily.com")),
    ).toBe(false);
  });

  it("forceSerperJina does not Tavily-extract when Jina fails", async () => {
    process.env.SERPER_API_KEY = "serper-test";
    process.env.JINA_API_KEY = "jina-test";
    process.env.TAVILY_API_KEY = "tavily-test";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("google.serper.dev")) {
        return new Response(
          JSON.stringify({
            organic: [
              {
                title: "Uber Investor Relations",
                link: "https://investor.uber.com/",
                snippet: "IR hub",
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("eu.r.jina.ai")) {
        return new Response("jina down", { status: 502 });
      }
      return new Response("unexpected tavily", { status: 500 });
    });

    const result = await fetchIrSiteDocuments({
      ticker: "UBER",
      companyName: "Uber Technologies, Inc.",
      preferSerperJina: true,
      forceSerperJina: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.provider).toBe("serper_jina");
    expect(result.hasUsefulContent).toBe(false);
    expect(result.extractCredits).toBe(0);
    expect(
      fetchImpl.mock.calls.some((c) => String(c[0]).includes("tavily.com")),
    ).toBe(false);
  });
});
