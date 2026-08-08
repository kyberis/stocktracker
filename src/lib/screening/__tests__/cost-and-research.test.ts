import { describe, expect, it } from "vitest";
import {
  emptyScreeningCostBreakdown,
  parseScreeningCostJson,
  roundUsd,
  totalScreeningCostUsd,
} from "@/lib/screening/cost";
import { extractLlmUsage } from "@/lib/screening/llm-usage";
import { calcAiLogCost } from "@/lib/db/ai-logs";
import { isFmpIrThin, type FetchFmpIrBundleResult } from "@/lib/screening/data/fmp-ir";

describe("screening cost ledger", () => {
  it("parses empty / invalid cost_json as zeros", () => {
    expect(parseScreeningCostJson("")).toEqual(emptyScreeningCostBreakdown());
    expect(parseScreeningCostJson("not-json")).toEqual(
      emptyScreeningCostBreakdown(),
    );
  });

  it("totals llm + tavily without fmp", () => {
    const b = {
      ...emptyScreeningCostBreakdown(),
      llmUsd: 0.12,
      tavilySearchUsd: 0.32,
      tavilyResearchUsd: 0.16,
    };
    expect(totalScreeningCostUsd(b)).toBe(roundUsd(0.6));
  });

  it("prices openai/ prefixed models", () => {
    const cost = calcAiLogCost("openai/gpt-4o-mini", 1_000_000, 0);
    expect(cost).toBeCloseTo(0.15, 5);
  });
});

describe("extractLlmUsage", () => {
  it("reads prompt/completion tokens", () => {
    expect(
      extractLlmUsage({
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    ).toEqual({ tokensInput: 10, tokensOutput: 5 });
  });
});

describe("isFmpIrThin", () => {
  it("flags missing transcript and news", () => {
    const thin: FetchFmpIrBundleResult = {
      ticker: "ABC",
      transcript: null,
      news: [],
      insiders: [],
      requestCount: 0,
      errors: [],
    };
    expect(isFmpIrThin(thin)).toBe(true);
  });

  it("accepts decent transcript + news", () => {
    const ok: FetchFmpIrBundleResult = {
      ticker: "ABC",
      transcript: {
        year: 2026,
        quarter: 1,
        date: "2026-01-01",
        excerpt: "x".repeat(250),
      },
      news: [
        {
          title: "News",
          publishedDate: null,
          url: "https://example.com",
          site: null,
        },
      ],
      insiders: [],
      requestCount: 2,
      errors: [],
    };
    expect(isFmpIrThin(ok)).toBe(false);
  });
});
