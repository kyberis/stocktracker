import { describe, expect, it } from "vitest";

import {
  buildIrPublicReferences,
  buildWebPublicReferences,
  isPublicReferenceUrl,
  mergePublicSourceRefs,
  toPublicSourceRef,
  unwrapReaderUrl,
} from "./public-references";

describe("public screening references", () => {
  it("rejects vendor and private hosts", () => {
    expect(isPublicReferenceUrl("https://investors.example.com/ir")).toBe(true);
    expect(isPublicReferenceUrl("https://api.tavily.com/search")).toBe(false);
    expect(isPublicReferenceUrl("https://google.serper.dev/search")).toBe(false);
    expect(isPublicReferenceUrl("https://r.jina.ai/https://evil.example")).toBe(
      true,
    );
    expect(isPublicReferenceUrl("https://financialmodelingprep.com/api")).toBe(
      false,
    );
    expect(isPublicReferenceUrl("https://api.openai.com/v1")).toBe(false);
    expect(isPublicReferenceUrl("https://api.company.com/ir")).toBe(false);
    expect(isPublicReferenceUrl("not-a-url")).toBe(false);
  });

  it("unwraps Jina Reader paths to the original public URL", () => {
    expect(
      unwrapReaderUrl("https://r.jina.ai/https://investors.example.com/q1"),
    ).toBe("https://investors.example.com/q1");
    const ref = toPublicSourceRef({
      url: "https://r.jina.ai/https://investors.example.com/q1",
      field: "document",
      label: "Q1",
    });
    expect(ref?.url).toBe("https://investors.example.com/q1");
  });

  it("builds IR references from hub, documents, and search hits", () => {
    const refs = buildIrPublicReferences({
      irPageUrl: "https://investors.tfiintl.com/",
      documents: [
        {
          url: "https://investors.tfiintl.com/news/q1",
          title: "Q1 results",
          asOf: "2026-04-24",
          excerpt: "Revenue grew 8%.",
          role: "document",
        },
      ],
      searchHits: [
        { url: "https://investors.tfiintl.com/", title: "IR home" },
        {
          url: "https://serper.dev/search?q=tfii",
          title: "should drop",
        },
        {
          url: "https://www.sec.gov/cgi-bin/browse-edgar",
          title: "SEC filings",
        },
      ],
    });
    expect(refs.map((r) => r.url)).toEqual([
      "https://investors.tfiintl.com/",
      "https://investors.tfiintl.com/news/q1",
      "https://www.sec.gov/cgi-bin/browse-edgar",
    ]);
    expect(refs[1]).toMatchObject({
      label: "Q1 results",
      excerpt: "Revenue grew 8%.",
      field: "document",
      asOf: "2026-04-24",
    });
    expect(refs[0]!.field).toBe("ir_page");
  });

  it("builds news references without vendor metadata", () => {
    const refs = buildWebPublicReferences({
      news: [
        {
          title: "Nike beats estimates",
          url: "https://www.reuters.com/nike",
          content: "Nike reported better than expected results.",
          publishedDate: "2026-08-01",
          source: "tavily",
        },
      ],
      analyst: [
        {
          title: "internal",
          url: "https://api.tavily.com/x",
          content: "secret",
          publishedDate: null,
          source: "tavily",
        },
      ],
    });
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({
      url: "https://www.reuters.com/nike",
      label: "Nike beats estimates",
      field: "news",
    });
    expect(JSON.stringify(refs)).not.toMatch(/tavily|serper|jina|fmp/i);
  });

  it("dedupes and drops private URLs when merging card sources", () => {
    const merged = mergePublicSourceRefs(
      [
        {
          url: "https://investors.example.com/ir",
          asOf: "2026-08-01",
          field: "ir_page",
        },
        {
          url: "https://investors.example.com/ir/",
          asOf: "2026-08-01",
          field: "guidance",
          label: "Guidance",
        },
        {
          url: "https://api.tavily.com/search",
          asOf: "2026-08-01",
          field: "sentiment",
        },
      ],
      20,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]!.url).toBe("https://investors.example.com/ir");
  });
});
