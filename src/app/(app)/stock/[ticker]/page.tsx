import StockDetailShell from "./stock-detail-shell";

interface PageProps {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ exchange?: string }>;
}

export default async function StockDetailPage({ params, searchParams }: PageProps) {
  const [{ ticker }, { exchange }] = await Promise.all([
    params,
    searchParams,
  ]);

  return (
    <StockDetailShell
      ticker={decodeURIComponent(ticker)}
      exchange={exchange || ""}
    />
  );
}
