import { describe, expect, it } from "vitest";
import {
  mergeIrResources,
  parseAnalyzeBriefMeta,
  parseIrStepCompletedPayload,
} from "@/lib/screening/analyze-admin";

describe("parseAnalyzeBriefMeta", () => {
  it("reads focus listing fields", () => {
    expect(
      parseAnalyzeBriefMeta(
        JSON.stringify({
          intent: "analyze",
          focusTicker: "uber",
          focusCompanyName: "Uber Technologies, Inc.",
          focusExchange: "NYQ",
        }),
      ),
    ).toEqual({
      ticker: "UBER",
      companyName: "Uber Technologies, Inc.",
      exchange: "NYQ",
    });
  });

  it("returns nulls on invalid JSON", () => {
    expect(parseAnalyzeBriefMeta("nope")).toEqual({
      ticker: null,
      companyName: null,
      exchange: null,
    });
  });
});

describe("parseIrStepCompletedPayload", () => {
  it("maps Serper/Jina IR payload", () => {
    expect(
      parseIrStepCompletedPayload(
        JSON.stringify({
          irSiteDocsUsed: true,
          provider: "serper_jina",
          serperQueries: 2,
          jinaUrls: 3,
        }),
      ),
    ).toEqual({
      provider: "serper_jina",
      serperQueries: 2,
      jinaUrls: 3,
      irSiteDocsUsed: true,
    });
  });

  it("ignores unknown providers", () => {
    expect(parseIrStepCompletedPayload(JSON.stringify({ provider: "firecrawl" })))
      .toMatchObject({ provider: null });
  });
});

describe("mergeIrResources", () => {
  it("sums counts and mixes providers", () => {
    expect(
      mergeIrResources([
        {
          provider: "serper_jina",
          serperQueries: 2,
          jinaUrls: 1,
          irSiteDocsUsed: true,
        },
        {
          provider: "tavily",
          serperQueries: 0,
          jinaUrls: 0,
          irSiteDocsUsed: false,
        },
      ]),
    ).toEqual({
      provider: "mixed",
      serperQueries: 2,
      jinaUrls: 1,
      irSiteDocsUsed: true,
    });
  });
});
