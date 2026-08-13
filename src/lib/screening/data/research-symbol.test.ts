import { describe, expect, it } from "vitest";
import {
  cleanCompanyNameForSearch,
  isSecondaryListingTicker,
  namesLikelySame,
  pickResearchSymbol,
  fmpSymbolForCandidate,
  scoreNameSearchHit,
} from "@/lib/screening/data/research-symbol";

describe("isSecondaryListingTicker", () => {
  it("flags German regional suffixes", () => {
    expect(isSecondaryListingTicker("W9C.MU")).toBe(true);
    expect(isSecondaryListingTicker("SAP.F")).toBe(true);
    expect(isSecondaryListingTicker("CSU.TO")).toBe(false);
    expect(isSecondaryListingTicker("TFII")).toBe(false);
    expect(isSecondaryListingTicker("SAP.DE")).toBe(false);
  });
});

describe("cleanCompanyNameForSearch", () => {
  it("strips Munich registered-share suffix and extra spaces", () => {
    expect(cleanCompanyNameForSearch("Constellation Software Inc.   R")).toBe(
      "Constellation Software Inc.",
    );
  });
});

describe("namesLikelySame", () => {
  it("matches CSI Munich name to TSX legal name", () => {
    expect(
      namesLikelySame(
        "Constellation Software Inc.   R",
        "Constellation Software Inc.",
      ),
    ).toBe(true);
  });

  it("rejects unrelated names", () => {
    expect(namesLikelySame("Constellation Software Inc.", "Apple Inc.")).toBe(
      false,
    );
  });
});

describe("pickResearchSymbol", () => {
  const hits = [
    {
      symbol: "W9C.MU",
      name: "Constellation Software Inc.",
      exchange: "MUN",
    },
    {
      symbol: "CNSWF",
      name: "Constellation Software Inc.",
      exchange: "PNK",
    },
    {
      symbol: "CSU.TO",
      name: "Constellation Software Inc.",
      exchange: "TSX",
    },
  ];

  it("maps Munich CSI listing to CSU.TO", () => {
    expect(
      pickResearchSymbol({
        listedTicker: "W9C.MU",
        companyName: "Constellation Software Inc.   R",
        hits,
      }),
    ).toBe("CSU.TO");
  });

  it("keeps a primary ticker that already matches", () => {
    expect(
      pickResearchSymbol({
        listedTicker: "CSU.TO",
        companyName: "Constellation Software Inc.",
        hits,
      }),
    ).toBe("CSU.TO");
  });

  it("keeps listed ticker when no name match", () => {
    expect(
      pickResearchSymbol({
        listedTicker: "W9C.MU",
        companyName: "Constellation Software Inc.",
        hits: [
          { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
        ],
      }),
    ).toBe("W9C.MU");
  });
});

describe("scoreNameSearchHit", () => {
  it("prefers TSX over OTC and Munich", () => {
    const base = {
      listedTicker: "W9C.MU",
      companyName: "Constellation Software Inc.",
    };
    const tsx = scoreNameSearchHit({
      ...base,
      hit: {
        symbol: "CSU.TO",
        name: "Constellation Software Inc.",
        exchange: "TSX",
      },
    });
    const otc = scoreNameSearchHit({
      ...base,
      hit: {
        symbol: "CNSWF",
        name: "Constellation Software Inc.",
        exchange: "PNK",
      },
    });
    expect(tsx).toBeGreaterThan(otc);
    expect(tsx).toBeGreaterThanOrEqual(70);
  });
});

describe("fmpSymbolForCandidate", () => {
  it("prefers researchTicker when set", () => {
    expect(
      fmpSymbolForCandidate({ ticker: "W9C.MU", researchTicker: "CSU.TO" }),
    ).toBe("CSU.TO");
    expect(fmpSymbolForCandidate({ ticker: "TFII" })).toBe("TFII");
  });
});
