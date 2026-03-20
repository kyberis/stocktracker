import { notFound } from "next/navigation";
import ToolsPageGate from "@/components/ToolsPageGate";

const VALID_TABS = [
  "transactions", "dividends", "performance", "taxonomy",
  "rebalancing", "accounts", "watchlist", "alerts", "tax", "simulator", "planning", "score",
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

  return <ToolsPageGate initialTab={tab as Tab} />;
}
