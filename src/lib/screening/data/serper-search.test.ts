import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSerperSearch } from "@/lib/screening/data/serper-search";

describe("fetchSerperSearch", () => {
  afterEach(() => {
    delete process.env.SERPER_API_KEY;
  });

  it("returns missing_api_key without calling fetch when unset", async () => {
    const fetchImpl = vi.fn();
    const res = await fetchSerperSearch({
      query: "CSU.TO investor relations",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.results).toEqual([]);
    expect(res.errors).toContain("missing_api_key");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps organic results and sets recency tbs", async () => {
    process.env.SERPER_API_KEY = "serper-test";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        organic: [
          {
            title: "CSI Investor Relations",
            link: "https://www.csisoftware.com/investor-relations/",
            snippet: "Official IR hub",
            date: "Aug 11, 2026",
          },
          { title: "skip me", link: "" },
        ],
      }),
      text: async () => "",
    });

    const res = await fetchSerperSearch({
      query: "Constellation Software CSU.TO investor relations",
      maxResults: 5,
      daysBack: 180,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(res.errors).toEqual([]);
    expect(res.results).toHaveLength(1);
    expect(res.results[0]).toMatchObject({
      title: "CSI Investor Relations",
      url: "https://www.csisoftware.com/investor-relations/",
      content: "Official IR hub",
      publishedDate: "Aug 11, 2026",
      source: "csisoftware.com",
    });
    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body ?? "{}"));
    expect(body.q).toContain("CSU.TO");
    expect(body.tbs).toBe("qdr:m6");
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://google.serper.dev/search");
  });

  it("fail-opens on HTTP errors", async () => {
    process.env.SERPER_API_KEY = "serper-test";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "slow down",
      json: async () => ({}),
    });
    const res = await fetchSerperSearch({
      query: "AAPL",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.results).toEqual([]);
    expect(res.errors[0]).toMatch(/^serper_429/);
  });
});
