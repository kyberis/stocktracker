import HoldingCard from "./HoldingCard";
import AllocationCard from "./AllocationCard";
import SummaryCard from "./SummaryCard";
import StockPickCard from "./StockPickCard";
import {
  tryParseChatCard,
  type AllocationCardData,
  type ChatCardKind,
  type HoldingCardData,
  type StockPickCardData,
  type SummaryCardData,
} from "./types";

export { default as HoldingCard } from "./HoldingCard";
export { default as AllocationCard } from "./AllocationCard";
export { default as SummaryCard } from "./SummaryCard";
export { default as StockPickCard } from "./StockPickCard";
export * from "./types";

export function ChatCardRenderer({
  kind,
  content,
}: {
  kind: ChatCardKind;
  content: string;
}) {
  switch (kind) {
    case "holding": {
      const d = tryParseChatCard<HoldingCardData>(content);
      return d ? <HoldingCard data={d} /> : <span className="text-red-500 text-xs">Invalid holding data</span>;
    }
    case "allocation": {
      const d = tryParseChatCard<AllocationCardData>(content);
      return d ? <AllocationCard data={d} /> : <span className="text-red-500 text-xs">Invalid allocation data</span>;
    }
    case "summary": {
      const d = tryParseChatCard<SummaryCardData>(content);
      return d ? <SummaryCard data={d} /> : <span className="text-red-500 text-xs">Invalid summary data</span>;
    }
    case "stock_pick": {
      const d = tryParseChatCard<StockPickCardData>(content);
      return d ? <StockPickCard data={d} /> : <span className="text-red-500 text-xs">Invalid stock pick data</span>;
    }
    default:
      return null;
  }
}
