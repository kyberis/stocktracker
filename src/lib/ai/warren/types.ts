import type {
  HoldingCardData,
  AllocationCardData,
  SummaryCardData,
  StockPickCardData,
} from "@/components/chat-cards/types";

export type WarrenPart =
  | { kind: "holding"; data: HoldingCardData }
  | { kind: "allocation"; data: AllocationCardData }
  | { kind: "summary"; data: SummaryCardData }
  | { kind: "stockPick"; data: StockPickCardData }
  | { kind: "stockSnapshot"; data: StockSnapshotData }
  | { kind: "chart"; data: ChartPartData };

/**
 * Channel-agnostic chart payload. The web client renders this with Recharts;
 * Telegram converts it into a QuickChart PNG and sends via `sendPhoto`. Keep
 * the shape small so the same data can flow over both transports.
 */
export interface ChartPartData {
  /** Pie = composition, line = time series, bar = comparison. */
  kind: "pie" | "line" | "bar";
  title: string;
  /** Optional currency suffix appended to the title (e.g. "EUR"). */
  currency?: string;
  /** For line/bar charts. */
  labels?: string[];
  values?: number[];
  /** For pie charts. */
  slices?: { label: string; value: number }[];
  /** Render bars horizontally — useful for long ticker labels. */
  horizontal?: boolean;
}

export interface StockSnapshotData {
  ticker: string;
  name?: string;
  price?: number;
  currency?: string;
  changePct?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export type WarrenProposalKind =
  | "addHolding"
  | "removeHolding"
  | "addCash"
  | "createAlert"
  | "addWatchlist";

export interface WarrenProposalBase {
  id: string;
  kind: WarrenProposalKind;
  title: string;
  summary: string;
  destructive?: boolean;
  rows: { label: string; value: string }[];
}

export interface AddHoldingProposalData {
  ticker: string;
  name?: string;
  shares: number;
  purchasePrice: number;
  displayCurrency: string;
  portfolioId?: string;
}

export interface RemoveHoldingProposalData {
  holdingId: string;
  portfolioId?: string;
}

export interface AddCashProposalData {
  name: string;
  amountEUR: number;
  type?: "cash" | "savings" | "pension" | "real_estate";
  displayCurrency?: string;
  portfolioId?: string;
}

export interface CreateAlertProposalData {
  ticker: string;
  condition: "above" | "below";
  threshold: number;
  alertType?: "threshold" | "percent_change";
  percentBasis?: "daily" | "purchase";
  percentValue?: number;
  currency?: string;
  isPortfolioWide?: boolean;
  portfolioId?: string;
}

export interface AddWatchlistProposalData {
  ticker: string;
  name?: string;
  exchange?: string;
}

export type WarrenProposal =
  | (WarrenProposalBase & { kind: "addHolding"; data: AddHoldingProposalData })
  | (WarrenProposalBase & { kind: "removeHolding"; data: RemoveHoldingProposalData })
  | (WarrenProposalBase & { kind: "addCash"; data: AddCashProposalData })
  | (WarrenProposalBase & { kind: "createAlert"; data: CreateAlertProposalData })
  | (WarrenProposalBase & { kind: "addWatchlist"; data: AddWatchlistProposalData });

export type WarrenStreamFrame =
  | { kind: "text"; delta: string }
  | { kind: "part"; part: WarrenPart }
  | { kind: "proposal"; proposal: WarrenProposal }
  | { kind: "tool_step"; label: string }
  | { kind: "error"; message: string }
  | { kind: "done" };
