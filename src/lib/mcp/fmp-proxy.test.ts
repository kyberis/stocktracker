import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clampFmpLimitBytes,
  fmpStableGet,
  sanitizeFmpParams,
  sanitizeFmpStablePath,
} from "@/lib/mcp/fmp-proxy";

vi.mock("@/lib/db", () => ({
  getGlobalFmpApiKey: vi.fn(() => "test-fmp-key"),
}));

describe("sanitizeFmpStablePath", () => {
  it("accepts nested stable paths", () => {
    expect(sanitizeFmpStablePath("historical-price-eod/full")).toEqual({
      ok: true,
      path: "historical-price-eod/full",
    });
    expect(sanitizeFmpStablePath("/news/stock/")).toEqual({ ok: true, path: "news/stock" });
  });

  it("rejects traversal, schemes, and query strings", () => {
    expect(sanitizeFmpStablePath("../quote").ok).toBe(false);
    expect(sanitizeFmpStablePath("https://evil.example/quote").ok).toBe(false);
    expect(sanitizeFmpStablePath("quote?symbol=AAPL").ok).toBe(false);
    expect(sanitizeFmpStablePath("quote#x").ok).toBe(false);
    expect(sanitizeFmpStablePath("a/b$c").ok).toBe(false);
  });
});

describe("sanitizeFmpParams", () => {
  it("strips apikey and coerces values", () => {
    expect(
      sanitizeFmpParams({ symbol: "AAPL", apikey: "leak", limit: 5, active: true }),
    ).toEqual({
      ok: true,
      params: { symbol: "AAPL", limit: "5", active: "true" },
    });
  });

  it("rejects non-object params", () => {
    expect(sanitizeFmpParams(["a"]).ok).toBe(false);
  });
});

describe("clampFmpLimitBytes", () => {
  it("clamps to safe bounds", () => {
    expect(clampFmpLimitBytes(undefined)).toBe(1_048_576);
    expect(clampFmpLimitBytes(100)).toBe(1_024);
    expect(clampFmpLimitBytes(9_000_000)).toBe(2_097_152);
  });
});

describe("fmpStableGet", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("injects server apikey and never trusts client apikey", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain("apikey=test-fmp-key");
      expect(url).not.toContain("apikey=client-leak");
      expect(url).toContain("symbol=AAPL");
      return new Response(JSON.stringify([{ symbol: "AAPL", price: 1 }]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fmpStableGet({
      path: "quote",
      params: { symbol: "AAPL", apikey: "client-leak" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.truncated).toBe(false);
      expect(result.data).toEqual([{ symbol: "AAPL", price: 1 }]);
      expect(result.disclaimer).toMatch(/not investment advice/i);
    }
  });

  it("returns truncated preview when over limitBytes", async () => {
    const big = JSON.stringify({ blob: "x".repeat(5000) });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(big, { status: 200 })),
    );

    const result = await fmpStableGet({ path: "stock-list", limitBytes: 1024 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.truncated).toBe(true);
      expect((result.data as { preview: string }).preview.length).toBeLessThanOrEqual(1024);
    }
  });

  it("maps Restricted Endpoint errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Restricted Endpoint", { status: 200 })),
    );
    const result = await fmpStableGet({ path: "senate-trades", params: { symbol: "AAPL" } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Restricted Endpoint/);
  });
});
