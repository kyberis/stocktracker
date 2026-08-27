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
      "presentImportOptions",
      "parseBrokerCsvImport",
      "extractAiPortfolioImport",
      "startSnapTradeConnect",
      "fetchSnapTradeImport",
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
      presentImportOptions: { id: "i" },
      consultClaraSavings: { id: "c" },
      getPortfolioSummary: { id: "g" },
    };
    expect(pickWarrenEmptyAddTools(tools)).toEqual({
      getQuote: { id: "q" },
      proposeAddHolding: { id: "a" },
      listPortfolios: { id: "p" },
      renderStockSnapshot: { id: "s" },
      presentImportOptions: { id: "i" },
    });
  });

  it("builds an appendix that forbids off-topic help", () => {
    const appendix = buildWarrenEmptyAddStockAppendix();
    expect(appendix).toMatch(/Empty portfolio add-stock mode/i);
    expect(appendix).toMatch(/proposeAddHolding/);
    expect(appendix).toMatch(/presentImportOptions/);
    expect(appendix).toMatch(/import your portfolio/i);
    expect(appendix).toMatch(/stock market \/ exchange/i);
  });
});
