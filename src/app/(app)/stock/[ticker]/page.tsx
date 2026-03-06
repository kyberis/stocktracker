import { getServerSession } from "@/lib/auth/server-session";
import { listHoldings, listCashEntries } from "@/lib/db";
import StockDetailShell from "./stock-detail-shell";

interface PageProps {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ exchange?: string }>;
}

export default async function StockDetailPage({ params, searchParams }: PageProps) {
  const [{ ticker }, { exchange }, session] = await Promise.all([
    params,
    searchParams,
    getServerSession(),
  ]);

  let initialHoldings;
  let initialCash;

  if (session) {
    [initialHoldings, initialCash] = await Promise.all([
      listHoldings(session.userId),
      listCashEntries(session.userId),
    ]);
  }

  return (
    <StockDetailShell
      ticker={decodeURIComponent(ticker)}
      exchange={exchange || ""}
      initialHoldings={initialHoldings ?? []}
      initialCash={initialCash ?? []}
    />
  );
}
