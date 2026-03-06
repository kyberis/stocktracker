import { getServerSession } from "@/lib/auth/server-session";
import { listHoldings, listCashEntries } from "@/lib/db";
import DashboardShell from "./dashboard-shell";

export default async function Home() {
  const session = await getServerSession();

  let initialHoldings;
  let initialCash;

  if (session) {
    [initialHoldings, initialCash] = await Promise.all([
      listHoldings(session.userId),
      listCashEntries(session.userId),
    ]);
  }

  return (
    <DashboardShell
      initialHoldings={initialHoldings ?? []}
      initialCash={initialCash ?? []}
    />
  );
}
