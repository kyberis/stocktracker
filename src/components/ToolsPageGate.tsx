"use client";

import PortfolioTools from "@/components/PortfolioTools";
import MobileToolsPage from "@/components/mobile/MobileToolsPage";
import { useIsNative } from "@/lib/use-native";
import type { ToolTabId } from "@/lib/tools-registry";

export default function ToolsPageGate({ initialTab }: { initialTab?: ToolTabId }) {
  const isNative = useIsNative();

  if (isNative) return <MobileToolsPage />;
  return <PortfolioTools initialTab={initialTab} />;
}
