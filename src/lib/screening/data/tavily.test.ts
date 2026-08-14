import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRecord } = vi.hoisted(() => ({
  mockRecord: vi.fn(),
}));

vi.mock("@/lib/screening/metrics", () => ({
  recordTavilyScreeningRequest: mockRecord,
}));

vi.mock("@/lib/screening/provider-circuit", () => ({
  noteScreeningProviderQuota: vi.fn(),
}));

describe("fetchTavilySearch", () => {
  beforeEach(() => {
    mockRecord.mockReset();
    delete process.env.TAVILY_API_KEY;
  });

  it("returns missing_api_key without calling fetch when unset", async () => {
    const fetchImpl = vi.fn();
    const { fetchTavilySearch } = await import("./tavily");
    const res = await fetchTavilySearch({
      query: "AAPL news",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.results).toEqual([]);
    expect(res.errors).toContain("missing_api_key");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("parses successful results and records ok", async () => {
    process.env.TAVILY_API_KEY = "tvly-test";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          {
            title: "Apple earnings",
            url: "https://example.com/aapl",
            content: "Beat estimates",
            published_date: "2026-08-01",
          },
        ],
      }),
      text: async () => "",
    });
    const { fetchTavilySearch } = await import("./tavily");
    const res = await fetchTavilySearch({
      query: "AAPL news",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.results).toHaveLength(1);
    expect(res.results[0]?.url).toContain("example.com");
    expect(mockRecord).toHaveBeenCalledWith("ok");
  });

  it("records rate_limited on 429", async () => {
    process.env.TAVILY_API_KEY = "tvly-test";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "slow down",
      json: async () => ({}),
    });
    const { fetchTavilySearch } = await import("./tavily");
    const res = await fetchTavilySearch({
      query: "AAPL",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.results).toEqual([]);
    expect(mockRecord).toHaveBeenCalledWith("rate_limited");
  });
});
