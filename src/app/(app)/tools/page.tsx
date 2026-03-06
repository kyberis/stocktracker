import { getServerSession } from "@/lib/auth/server-session";
import { listHoldings, listCashEntries } from "@/lib/db";
import ToolsShell from "./tools-shell";

export default async function ToolsPage() {
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
    <ToolsShell
      initialHoldings={initialHoldings ?? []}
      initialCash={initialCash ?? []}
    />
  );
}
