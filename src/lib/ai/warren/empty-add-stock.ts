/**
 * Empty-portfolio “add stock” mode for Warren.
 *
 * When the active portfolio has no holdings, Warren is restricted to helping
 * the user add stocks (cost control + clear UX). Burst limit: 10 consults,
 * then a 15-minute cooldown before the next burst.
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
    "You may ONLY help them add stocks via `proposeAddHolding`.",
    "Allowed tools: `getQuote`, `listPortfolios`, `proposeAddHolding`, `renderStockSnapshot`.",
    "If details are missing (ticker, shares, purchase price, currency, optional date), ask briefly for what you need — then propose.",
    "Use `getQuote` to verify a ticker or suggest a current price when helpful; never invent prices.",
    "If the user asks for anything else (analysis, news, Clara, Will, screener, education, alerts, cash, removals), politely refuse and redirect:",
    '"Right now I can only help you add stocks to your empty portfolio. Tell me a ticker, shares, and purchase price."',
    "Never claim a holding was saved until the user confirms the proposal card.",
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
