/**
 * Empty-portfolio mode for Warren.
 *
 * When the active portfolio has no holdings, Warren is restricted to helping
 * the user add stocks or import a portfolio (cost control + clear UX). Burst
 * limit: 10 consults, then a 15-minute cooldown before the next burst.
 */

export const WARREN_EMPTY_ADD_PROVIDER = "warren_empty_add";
export const WARREN_EMPTY_ADD_MAX_CONSULTS = 10;
export const WARREN_EMPTY_ADD_COOLDOWN_MS = 15 * 60 * 1000;

/** Tools allowed while the portfolio has zero holdings. */
export const WARREN_EMPTY_ADD_TOOL_NAMES = [
  "getQuote",
  "listPortfolios",
  "proposeAddHolding",
  "renderStockSnapshot",
  "presentImportOptions",
  "parseBrokerCsvImport",
  "extractAiPortfolioImport",
  "startSnapTradeConnect",
  "fetchSnapTradeImport",
] as const;

export type WarrenEmptyAddToolName = (typeof WARREN_EMPTY_ADD_TOOL_NAMES)[number];

export function isWarrenEmptyAddToolName(name: string): name is WarrenEmptyAddToolName {
  return (WARREN_EMPTY_ADD_TOOL_NAMES as readonly string[]).includes(name);
}

/** System appendix injected when holdingsCount === 0. */
export function buildWarrenEmptyAddStockAppendix(): string {
  return [
    "TASK OVERRIDE — Empty portfolio add-stock mode:",
    "The user's portfolio has no holdings yet.",
    "You may help them add stocks via `proposeAddHolding` OR import a portfolio via the import tools.",
    "Allowed tools: `getQuote`, `listPortfolios`, `proposeAddHolding`, `renderStockSnapshot`, `presentImportOptions`, `parseBrokerCsvImport`, `extractAiPortfolioImport`, `startSnapTradeConnect`, `fetchSnapTradeImport`.",
    "If they want to import (CSV, broker, screenshot): you MUST call `presentImportOptions` in the same turn — never only say you will show options. On web the client also mounts the /import broker picker. Never invent rows.",
    "If details are missing for a manual add (ticker, shares, purchase price, currency, optional date), ask briefly for what you need — then propose.",
    "If the stock market / exchange is missing or ambiguous (e.g. Apple on NASDAQ vs a listing on another venue), ask which market before calling `proposeAddHolding`.",
    "Use `getQuote` to verify a ticker or suggest a current price when helpful; never invent prices.",
    "If the user asks for anything else (analysis, news, Clara, Will, screener, education, alerts, cash, removals), politely refuse and redirect:",
    '"Right now I can help you add stocks or import your portfolio. Tell me a ticker, or say import."',
    "Never claim a holding was saved or an import finished until the user confirms the proposal card.",
  ].join("\n");
}

export function pickWarrenEmptyAddTools<T extends Record<string, unknown>>(
  tools: T,
): Pick<T, WarrenEmptyAddToolName & keyof T> {
  const out = {} as Pick<T, WarrenEmptyAddToolName & keyof T>;
  for (const name of WARREN_EMPTY_ADD_TOOL_NAMES) {
    if (name in tools) {
      (out as Record<string, unknown>)[name] = tools[name];
    }
  }
  return out;
}
