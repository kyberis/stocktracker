import type {
  HoldingCardData,
  AllocationCardData,
  SummaryCardData,
  StockPickCardData,
} from "@/components/chat-cards/types";

export type WarrentPart =
  | { kind: "holding"; data: HoldingCardData }
  | { kind: "allocation"; data: AllocationCardData }
  | { kind: "summary"; data: SummaryCardData }
  | { kind: "stockPick"; data: StockPickCardData }
  | { kind: "stockSnapshot"; data: StockSnapshotData };

export interface StockSnapshotData {
  ticker: string;
  name?: string;
  price?: number;
  currency?: string;
  changePct?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export type WarrentProposalKind =
  | "addHolding"
  | "removeHolding"
  | "addCash"
  | "createAlert"
  | "addWatchlist";

export interface WarrentProposalBase {
  id: string;
  kind: WarrentProposalKind;
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

export type WarrentProposal =
  | (WarrentProposalBase & { kind: "addHolding"; data: AddHoldingProposalData })
  | (WarrentProposalBase & { kind: "removeHolding"; data: RemoveHoldingProposalData })
  | (WarrentProposalBase & { kind: "addCash"; data: AddCashProposalData })
  | (WarrentProposalBase & { kind: "createAlert"; data: CreateAlertProposalData })
  | (WarrentProposalBase & { kind: "addWatchlist"; data: AddWatchlistProposalData });

export type WarrentStreamFrame =
  | { kind: "text"; delta: string }
  | { kind: "part"; part: WarrentPart }
  | { kind: "proposal"; proposal: WarrentProposal }
  | { kind: "tool_step"; label: string }
  | { kind: "error"; message: string }
  | { kind: "done" };
