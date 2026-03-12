import { getServerSession } from "@/lib/auth/server-session";
import { listHoldings, listCashEntries } from "@/lib/db";
import ToolsLayoutClient from "./tools-layout-client";

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
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
    <ToolsLayoutClient
      initialHoldings={initialHoldings ?? []}
      initialCash={initialCash ?? []}
    >
      {children}
    </ToolsLayoutClient>
  );
}
