import { getServerSession } from "@/lib/auth/server-session";
import { listHoldings } from "@/lib/db";
import ScreenerShell from "./screener-shell";

export default async function ScreenerPage() {
  const session = await getServerSession();
  let initialHoldings;
  if (session) {
    initialHoldings = await listHoldings(session.userId);
  }
  return <ScreenerShell initialHoldings={initialHoldings ?? []} />;
}
