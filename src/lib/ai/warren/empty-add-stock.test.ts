import { describe, expect, it } from "vitest";
import {
  WARREN_EMPTY_ADD_TOOL_NAMES,
  buildWarrenEmptyAddStockAppendix,
  isWarrenEmptyAddToolName,
  pickWarrenEmptyAddTools,
} from "./empty-add-stock";

describe("empty-add-stock", () => {
  it("exposes the allowlisted tool names", () => {
    expect(WARREN_EMPTY_ADD_TOOL_NAMES).toEqual([
      "getQuote",
      "listPortfolios",
      "proposeAddHolding",
      "renderStockSnapshot",
    ]);
    expect(isWarrenEmptyAddToolName("proposeAddHolding")).toBe(true);
    expect(isWarrenEmptyAddToolName("consultClaraSavings")).toBe(false);
  });

  it("picks only allowlisted tools from a tool map", () => {
    const tools = {
      getQuote: { id: "q" },
      proposeAddHolding: { id: "a" },
      listPortfolios: { id: "p" },
      renderStockSnapshot: { id: "s" },
      consultClaraSavings: { id: "c" },
      getPortfolioSummary: { id: "g" },
    };
    expect(pickWarrenEmptyAddTools(tools)).toEqual({
      getQuote: { id: "q" },
      proposeAddHolding: { id: "a" },
      listPortfolios: { id: "p" },
      renderStockSnapshot: { id: "s" },
    });
  });

  it("builds an appendix that forbids off-topic help", () => {
    const appendix = buildWarrenEmptyAddStockAppendix();
    expect(appendix).toMatch(/Empty portfolio add-stock mode/i);
    expect(appendix).toMatch(/proposeAddHolding/);
    expect(appendix).toMatch(/only help you add stocks/i);
  });
});
