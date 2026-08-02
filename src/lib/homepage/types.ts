export type HomeDayHighlightReason =
  | { kind: "move"; pct: number; eurImpact: number }
  | { kind: "earnings"; when: "today" | "tomorrow" | string }
  | { kind: "news"; headline: string; impactScore: number }
  | { kind: "near_52w"; side: "high" | "low"; distancePct: number }
  | { kind: "alert"; label: string }
  | { kind: "ex_div"; date: string };

export type HomeDayHighlight = {
  ticker: string;
  rank: number;
  score: number;
  reasons: HomeDayHighlightReason[];
};

export type DayHighlightHoldingInput = {
  ticker: string;
  shares: number;
  changePercent: number | null;
  price: number | null;
  previousClose: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  /** Approximate day P&L in EUR (or display base). */
  eurDayImpact: number | null;
};

export type DayHighlightEventInput = {
  ticker: string;
  type: string;
  date: string; // YYYY-MM-DD
};

export type DayHighlightNewsInput = {
  ticker: string;
  headline: string;
  impactScore: number;
};

export type DayHighlightAlertInput = {
  ticker: string;
  label: string;
};
