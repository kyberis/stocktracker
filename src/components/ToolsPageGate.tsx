"use client";

import { useState } from "react";
import PortfolioTools from "@/components/PortfolioTools";
import MobileToolsPage from "@/components/mobile/MobileToolsPage";
import { isNativePlatform } from "@/lib/capacitor";

type Tab = "transactions" | "dividends" | "performance" | "taxonomy" | "rebalancing" | "accounts" | "watchlist" | "alerts" | "screener" | "tax" | "simulator";

export default function ToolsPageGate({ initialTab }: { initialTab?: Tab }) {
  const [native] = useState(() => isNativePlatform());

  if (native) return <MobileToolsPage />;
  return <PortfolioTools initialTab={initialTab} />;
}
