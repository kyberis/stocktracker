export interface HoldingCardData {
  ticker: string;
  name?: string;
  shares?: number;
  avgPrice?: number;
  currentPrice?: number;
  currency?: string;
  change?: number;
  changePct?: number;
  privacy: "full" | "anonymous" | "ticker_only";
}

export interface AllocationCardData {
  items: { label: string; pct: number; color: string }[];
  totalValue?: number;
  currency?: string;
  privacy: "full" | "percentages" | "categories";
}

export interface SummaryCardData {
  totalValue?: number;
  dayChange?: number;
  dayChangePct?: number;
  holdingsCount: number;
  topHoldings?: { ticker: string; pct: number }[];
  currency?: string;
  privacy: "full" | "percentages" | "count_only";
}

export interface StockPickCardData {
  ticker: string;
  name?: string;
  currentPrice?: number;
  currency?: string;
  note?: string;
}

export type ChatCardKind = "holding" | "allocation" | "summary" | "stock_pick";

export function tryParseChatCard<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function formatChatCardNumber(n: number, currency?: string): string {
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!currency) return formatted;
  const sym: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CHF: "CHF ",
    JPY: "¥",
  };
  return `${sym[currency] || currency + " "}${formatted}`;
}
