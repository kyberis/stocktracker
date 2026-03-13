import { notFound } from "next/navigation";
import PortfolioTools from "@/components/PortfolioTools";

const VALID_TABS = [
  "transactions", "dividends", "performance", "taxonomy",
  "rebalancing", "accounts", "watchlist", "alerts",
] as const;

type Tab = (typeof VALID_TABS)[number];

interface PageProps {
  params: Promise<{ tab: string }>;
}

export default async function ToolsTabPage({ params }: PageProps) {
  const { tab } = await params;

  if (!VALID_TABS.includes(tab as Tab)) {
    notFound();
  }

  return <PortfolioTools initialTab={tab as Tab} />;
}
