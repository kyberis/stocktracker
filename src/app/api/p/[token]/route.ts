import { NextRequest, NextResponse } from "next/server";
import { ensureInitialized } from "@/lib/db/client";
import { listHoldings, findUserById } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

/**
 * GET /api/p/[token] — public read-only portfolio view (no auth required)
 */
export const GET = withMetrics("/api/p/[token]", async (req: NextRequest, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const client = await ensureInitialized();
  const shareResult = await client.execute({
    sql: "SELECT user_id, is_active, show_values, excluded_tickers FROM portfolio_shares WHERE id = ?",
    args: [token],
  });

  if (shareResult.rows.length === 0 || !shareResult.rows[0].is_active) {
    return NextResponse.json({ error: "Portfolio not found or has been disabled" }, { status: 404 });
  }

  const row = shareResult.rows[0];
  const userId = row.user_id as string;
  const showValues = Boolean(row.show_values);
  const excludedTickers: string[] = JSON.parse((row.excluded_tickers as string) || "[]");

  const [owner, holdings] = await Promise.all([
    findUserById(userId),
    listHoldings(userId),
  ]);

  const filteredHoldings = holdings
    .filter((h) => !excludedTickers.includes(h.ticker))
    .map((h) => ({
      ticker: h.ticker,
      name: h.name,
      shares: showValues ? h.shares : undefined,
      purchasePrice: showValues ? h.purchasePrice : undefined,
      displayCurrency: h.displayCurrency,
      exchange: h.exchange,
      assetType: h.assetType,
      sector: h.sector,
      region: h.region,
      assetClass: h.assetClass,
    }));

  // Track server-side (no user association for public page)
  await client.execute({
    sql: "INSERT INTO analytics_events (id, user_id, event, metadata, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
    args: [
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      "public",
      "portfolio_share_viewed",
      JSON.stringify({ token: token.slice(0, 4) + "****" }),
    ],
  });

  return NextResponse.json({
    displayName: owner?.display_name || owner?.username || "Investor",
    showValues,
    holdings: filteredHoldings,
    holdingsCount: filteredHoldings.length,
  });
});
