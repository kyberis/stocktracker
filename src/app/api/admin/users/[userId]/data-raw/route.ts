import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  findUserById,
  listHoldingsRaw,
  listTransactionsRaw,
  listTransactionPortfolioMapRaw,
  listCashEntriesRaw,
  listCryptoHoldingsRaw,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/users/[userId]/data-raw", async (
  req: NextRequest,
  ctx?: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { userId } = (ctx as { params: { userId: string } }).params;

  const dbUser = await findUserById(userId);
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || undefined;

  const [holdings, transactions, transactionPortfolioMap, cash, crypto] = await Promise.all([
    listHoldingsRaw(userId, portfolioId),
    listTransactionsRaw(userId, portfolioId),
    listTransactionPortfolioMapRaw(userId, portfolioId),
    listCashEntriesRaw(userId, portfolioId),
    listCryptoHoldingsRaw(userId, portfolioId),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    userId,
    portfolioId: portfolioId ?? null,
    holdings,
    transactions,
    transactionPortfolioMap,
    cash,
    crypto,
  };

  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  const filename = `user-${safeId}-db-snapshot.json`;

  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
