import { describe, expect, it } from "vitest";
import { parseImportEntrySearch, warrenImportHref } from "./import-entry";

describe("warrenImportHref", () => {
  it("opens SnapTrade on /import with the selected broker slug", () => {
    expect(warrenImportHref({ type: "snaptrade", brokerSlug: "degiro" })).toBe(
      "/import?method=snaptrade_api&broker=degiro",
    );
  });

  it("opens CSV upload for Trade Republic and unmatched brokers", () => {
    expect(
      warrenImportHref({
        type: "csv",
        guideId: "trade_republic",
        format: "trade_republic",
      }),
    ).toBe("/import?method=broker_csv&guide=trade_republic&format=trade_republic");
    expect(
      warrenImportHref({ type: "csv", guideId: "simple_csv", query: "Foo Bank" }),
    ).toBe("/import?method=broker_csv&guide=simple_csv&q=Foo+Bank");
  });

  it("opens manual add on the same import wizard", () => {
    expect(warrenImportHref({ type: "manual" })).toBe("/import?method=manual");
  });
});

describe("parseImportEntrySearch", () => {
  it("reads method, broker, and csv picker params", () => {
    expect(parseImportEntrySearch("?method=snaptrade_api&broker=ibkr")).toEqual({
      method: "snaptrade_api",
      brokerSlug: "ibkr",
      csvGuideId: "",
      csvFormat: "",
      csvQuery: "",
    });
    expect(
      parseImportEntrySearch("method=broker_csv&guide=simple_csv&q=Revolut"),
    ).toMatchObject({
      method: "broker_csv",
      csvGuideId: "simple_csv",
      csvQuery: "Revolut",
    });
  });

  it("ignores unknown methods", () => {
    expect(parseImportEntrySearch("?method=nope").method).toBeNull();
  });
});
