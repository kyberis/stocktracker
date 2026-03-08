import { getServerSession } from "@/lib/auth/server-session";
import { listHoldings, listCashEntries } from "@/lib/db";
import ImportShell from "./import-shell";

export default async function ImportPage() {
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
    <ImportShell
      initialHoldings={initialHoldings ?? []}
      initialCash={initialCash ?? []}
    />
  );
}
