"use client";

import PortfolioTools from "@/components/PortfolioTools";
import MobileToolsPage from "@/components/mobile/MobileToolsPage";
import { useIsNative } from "@/lib/use-native";

type Tab = "transactions" | "dividends" | "performance" | "taxonomy" | "rebalancing" | "accounts" | "watchlist" | "alerts" | "screener" | "tax" | "simulator" | "planning" | "score";

export default function ToolsPageGate({ initialTab }: { initialTab?: Tab }) {
  const isNative = useIsNative();

  if (isNative) return <MobileToolsPage />;
  return <PortfolioTools initialTab={initialTab} />;
}
