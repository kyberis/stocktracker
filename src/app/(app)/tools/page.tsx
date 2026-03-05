"use client";

import { PortfolioProvider } from "@/lib/portfolio-context";
import PortfolioTools from "@/components/PortfolioTools";

export default function ToolsPage() {
  return (
    <PortfolioProvider>
      <PortfolioTools />
    </PortfolioProvider>
  );
}
