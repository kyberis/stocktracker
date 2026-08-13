import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJinaExtract } from "@/lib/screening/data/jina-extract";

describe("fetchJinaExtract", () => {
  afterEach(() => {
    delete process.env.JINA_API_KEY;
  });

  it("returns missing_api_key without calling fetch when unset", async () => {
    const fetchImpl = vi.fn();
    const res = await fetchJinaExtract({
      urls: ["https://investors.example.com/"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.results).toEqual([]);
    expect(res.errors).toContain("missing_api_key");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps JSON content, truncates, and records failed URLs", async () => {
    process.env.JINA_API_KEY = "jina-test";
    const long = "Revenue grew. ".repeat(500);
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (String(body.url).includes("fail")) {
        return {
          ok: false,
          status: 502,
          text: async () => "upstream",
          json: async () => ({}),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { content: long } }),
        text: async () => "",
      };
    });

    const res = await fetchJinaExtract({
      urls: [
        "https://investors.example.com/q1.pdf",
        "https://investors.example.com/fail.pdf",
      ],
      maxContentChars: 1200,
      pdf: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(res.results).toHaveLength(1);
    expect(res.results[0]?.content.length).toBe(1200);
    expect(res.failedUrls).toHaveLength(1);
    expect(res.failedUrls[0]?.error).toMatch(/^jina_502/);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://eu.r.jina.ai/");
    const headers = fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer jina-test");
    expect(headers.Accept).toBe("application/json");
  });

  it("treats empty content as a failed URL", async () => {
    process.env.JINA_API_KEY = "jina-test";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { content: "   " } }),
      text: async () => "",
    });
    const res = await fetchJinaExtract({
      urls: ["https://investors.example.com/"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.results).toEqual([]);
    expect(res.failedUrls[0]?.error).toBe("jina_empty");
  });
});
