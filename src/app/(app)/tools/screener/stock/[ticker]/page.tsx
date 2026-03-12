import StockDetail from "@/components/StockDetail";

interface PageProps {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ exchange?: string }>;
}

export default async function ScreenerStockPage({ params, searchParams }: PageProps) {
  const [{ ticker }, { exchange }] = await Promise.all([params, searchParams]);

  return <StockDetail ticker={decodeURIComponent(ticker)} exchange={exchange || ""} fromScreener />;
}
