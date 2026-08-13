import { afterEach, describe, expect, it, vi } from "vitest";
import { seedFocusCandidate } from "@/lib/screening/data/seed-focus-candidate";

describe("seedFocusCandidate", () => {
  afterEach(() => {
    delete process.env.FMP_API_KEY;
  });

  it("maps a Munich listing to CSU.TO and keeps the display ticker", async () => {
    process.env.FMP_API_KEY = "test-key";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/search-name")) {
        return new Response(
          JSON.stringify([
            {
              symbol: "W9C.MU",
              name: "Constellation Software Inc.",
              exchange: "MUN",
            },
            {
              symbol: "CSU.TO",
              name: "Constellation Software Inc.",
              exchange: "TSX",
            },
          ]),
          { status: 200 },
        );
      }
      if (url.includes("/profile") && url.includes("symbol=CSU.TO")) {
        return new Response(
          JSON.stringify([
            {
              symbol: "CSU.TO",
              companyName: "Constellation Software Inc.",
              sector: "Technology",
              industry: "Software",
              country: "CA",
              exchangeShortName: "TSX",
              mktCap: 70_000_000_000,
              price: 4500,
            },
          ]),
          { status: 200 },
        );
      }
      if (url.includes("/profile")) {
        return new Response("[]", { status: 200 });
      }
      return new Response("nope", { status: 404 });
    });

    const seed = await seedFocusCandidate("W9C.MU", {
      companyName: "Constellation Software Inc.   R",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(seed).toMatchObject({
      ticker: "W9C.MU",
      researchTicker: "CSU.TO",
      sector: "Technology",
      country: "CA",
    });
    expect(seed?.name).toContain("Constellation");
  });
});
