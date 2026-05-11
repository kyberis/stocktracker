import { notFound } from "next/navigation";
import ToolsPageGate from "@/components/ToolsPageGate";
import { VALID_DYNAMIC_TAB_IDS, type ToolTabId } from "@/lib/tools-registry";

/** Tab ids for this segment; `screener` and `warren-screener` are nested under `tools/*` instead. */
const validDynamicSet = new Set<string>(VALID_DYNAMIC_TAB_IDS);

interface PageProps {
  params: Promise<{ tab: string }>;
}

export default async function ToolsTabPage({ params }: PageProps) {
  const { tab } = await params;

  if (!validDynamicSet.has(tab)) {
    notFound();
  }

  return <ToolsPageGate initialTab={tab as ToolTabId} />;
}
