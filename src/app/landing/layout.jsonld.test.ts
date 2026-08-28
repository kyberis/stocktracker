import { describe, it, expect } from "vitest";
import { SOFTWARE_APP_SCHEMA, FAQ_SCHEMA } from "./layout";

// FAQ_SCHEMA is rendered unconditionally (not gated behind commerce_enabled),
// so this must never regress to describing the retired 3-tier "Bifolio"
// pricing model, regardless of the commerce flag state.
const STALE_STRINGS = ["Bifolio", "2.99", "2,99"];

function assertNoStaleStrings(json: string) {
  for (const stale of STALE_STRINGS) {
    expect(json, `found stale "${stale}" in JSON-LD`).not.toContain(stale);
  }
}

describe("landing JSON-LD structured data", () => {
  it("FAQ_SCHEMA has no stale Bifolio/€2.99 references", () => {
    const json = JSON.stringify(FAQ_SCHEMA);
    assertNoStaleStrings(json);
  });

  it("FAQ_SCHEMA only names the real Folio/Trefolio plans", () => {
    const json = JSON.stringify(FAQ_SCHEMA);
    expect(json).toContain("Folio");
    expect(json).toContain("Trefolio");
  });

  it("FAQ_SCHEMA includes the Clover / Warren / Clara FAQ matching visible copy", () => {
    const json = JSON.stringify(FAQ_SCHEMA);
    expect(json).toContain("How do Clover, Warren, and Clara work together?");
    expect(json).toContain("Clover is trefolio");
    expect(json).toContain("not financial advice");
    expect(json).not.toContain("What is the Agent Office?");
  });

  it("SOFTWARE_APP_SCHEMA.offers has exactly the 2 real plans (Folio, Trefolio), no stale references", () => {
    const json = JSON.stringify(SOFTWARE_APP_SCHEMA.offers);
    assertNoStaleStrings(json);
    expect(SOFTWARE_APP_SCHEMA.offers).toHaveLength(2);
    expect(SOFTWARE_APP_SCHEMA.offers.map((o) => o.name)).toEqual(["Folio", "Trefolio"]);
  });

  it("SOFTWARE_APP_SCHEMA.offers[0] (the commerce_enabled=false slice) is clean on its own", () => {
    // src/app/landing/layout.tsx keeps only offers[0] when commerce is off —
    // assert that slice alone is also free of stale content.
    const json = JSON.stringify(SOFTWARE_APP_SCHEMA.offers[0]);
    assertNoStaleStrings(json);
    expect(SOFTWARE_APP_SCHEMA.offers[0].name).toBe("Folio");
  });

  it("SOFTWARE_APP_SCHEMA featureList has no stale references", () => {
    const json = JSON.stringify(SOFTWARE_APP_SCHEMA.featureList);
    assertNoStaleStrings(json);
  });
});
