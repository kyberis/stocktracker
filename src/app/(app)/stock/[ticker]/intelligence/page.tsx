import StockIntelligenceShell from "./stock-intelligence-shell";

interface PageProps {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ exchange?: string }>;
}

export default async function StockIntelligencePage({ params, searchParams }: PageProps) {
  const [{ ticker }, { exchange }] = await Promise.all([
    params,
    searchParams,
  ]);

  return (
    <StockIntelligenceShell
      ticker={decodeURIComponent(ticker)}
      exchange={exchange || ""}
    />
  );
}
