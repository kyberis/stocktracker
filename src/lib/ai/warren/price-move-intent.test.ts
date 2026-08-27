import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  listHoldings: vi.fn(),
  listCalendarEvents: vi.fn(),
}));

import { listCalendarEvents, listHoldings } from "@/lib/db";
import {
  buildPriceMovePrefetchAppendix,
  editDistance,
  extractPriceMoveQuery,
  matchHoldingsToQuery,
  resolveTickerAgainstHoldings,
  wantsPriceMoveIntent,
} from "./price-move-intent";

describe("wantsPriceMoveIntent", () => {
  it("detects Spanish and English price-move asks", () => {
    expect(wantsPriceMoveIntent("Porque Sarabi gold bajo?")).toBe(true);
    expect(wantsPriceMoveIntent("why did Uber drop?")).toBe(true);
    expect(wantsPriceMoveIntent("qué pasó con AAPL")).toBe(true);
    expect(wantsPriceMoveIntent("how much is my AAPL worth?")).toBe(false);
  });
});

describe("extractPriceMoveQuery", () => {
  it("extracts company phrases", () => {
    expect(extractPriceMoveQuery("Porque Sarabi gold bajo?")).toBe("Sarabi gold");
    expect(extractPriceMoveQuery("why did UBER drop?")).toBe("UBER");
  });
});

describe("matchHoldingsToQuery", () => {
  const holdings = [
    { ticker: "SRB.L", name: "Serabi Gold plc" },
    { ticker: "UBER", name: "Uber Technologies" },
  ];

  it("fuzzy-matches Sarabi → Serabi Gold / SRB.L", () => {
    const hits = matchHoldingsToQuery(holdings, "Sarabi gold");
    expect(hits[0]?.ticker).toBe("SRB.L");
  });

  it("matches bare ticker to venue suffix", () => {
    expect(matchHoldingsToQuery(holdings, "SRB")[0]?.ticker).toBe("SRB.L");
  });
});

describe("resolveTickerAgainstHoldings", () => {
  it("maps SRB → SRB.L", () => {
    expect(resolveTickerAgainstHoldings("SRB", [{ ticker: "SRB.L" }])).toBe("SRB.L");
  });

  it("keeps unknown symbols", () => {
    expect(resolveTickerAgainstHoldings("AAPL", [{ ticker: "SRB.L" }])).toBe("AAPL");
  });
});

describe("editDistance", () => {
  it("treats sarabi/serabi as one edit", () => {
    expect(editDistance("sarabi", "serabi")).toBe(1);
  });
});

describe("buildPriceMovePrefetchAppendix", () => {
  it("injects holding match and today earnings", async () => {
    vi.mocked(listHoldings).mockResolvedValue([
      {
        id: "1",
        userId: "u1",
        ticker: "SRB.L",
        name: "Serabi Gold plc",
        shares: 100,
        purchasePrice: 2,
        displayCurrency: "GBX",
        purchaseDate: "2024-01-01",
        assetType: "stock",
      },
    ] as never);
    vi.mocked(listCalendarEvents).mockResolvedValue([
      {
        id: "e1",
        event_type: "earnings",
        symbol: "SRB.L",
        name: "Serabi Gold",
        event_date: new Date().toISOString().slice(0, 10),
        event_time: "amc",
        details: null,
        created_at: "",
        updated_at: "",
      },
    ]);

    const appendix = await buildPriceMovePrefetchAppendix("Porque Sarabi gold bajo?", {
      userId: "u1",
    });
    expect(appendix).toContain("SRB.L");
    expect(appendix).toContain("getMarketCatalysts");
    expect(appendix).toMatch(/earnings TODAY/i);
  });
});
