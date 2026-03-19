import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { ensureInitialized } from "@/lib/db/client";
import { findUserById } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

interface Point {
  date: string;
  value: number;
  invested: number;
}

export const GET = withMetrics("/api/admin/users/[userId]/history", async (
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

  const portfolioId = req.nextUrl.searchParams.get("portfolioId") || "";

  const client = await ensureInitialized();

  const cols = "date, total_value_eur as value, total_invested_eur as invested";
  const sql = `SELECT ${cols}
               FROM portfolio_snapshots
               WHERE user_id = ? AND portfolio_id = ?
               ORDER BY date ASC`;

  const result = await client.execute({ sql, args: [userId, portfolioId] });

  const points: Point[] = result.rows.map((row) => ({
    date: row.date as string,
    value: row.value as number,
    invested: (row.invested as number) || 0,
  }));

  return NextResponse.json({ points });
});
