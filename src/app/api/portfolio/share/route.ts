import { NextRequest, NextResponse } from "next/server";
import { requirePro } from "@/lib/auth/guards";
import { ensureInitialized } from "@/lib/db/client";
import { generateId } from "@/lib/utils";
import { trackEvent } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

/**
 * POST /api/portfolio/share — create or regenerate share token (Pro only)
 */
export const POST = withMetrics("/api/portfolio/share POST", async (req: NextRequest) => {
  const { session, error } = await requirePro(req);
  if (error || !session) return error!;

  let showValues = false;
  let excludedTickers: string[] = [];
  try {
    const body = await req.json().catch(() => ({}));
    showValues = Boolean(body.showValues);
    excludedTickers = Array.isArray(body.excludedTickers) ? body.excludedTickers : [];
  } catch {
    // use defaults
  }

  const token = generateId();
  const client = await ensureInitialized();

  // Upsert: one share per user
  await client.execute({
    sql: `INSERT INTO portfolio_shares (id, user_id, is_active, show_values, excluded_tickers)
          VALUES (?, ?, 1, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            id = excluded.id,
            is_active = 1,
            show_values = excluded.show_values,
            excluded_tickers = excluded.excluded_tickers`,
    args: [
      token,
      session.userId,
      showValues ? 1 : 0,
      JSON.stringify(excludedTickers),
    ],
  });

  await trackEvent(session.userId, "portfolio_share_created");

  const url = `${new URL(req.url).origin}/p/${token}`;
  return NextResponse.json({ token, url });
});

/**
 * DELETE /api/portfolio/share — deactivate share (Pro only)
 */
export const DELETE = withMetrics("/api/portfolio/share DELETE", async (req: NextRequest) => {
  const { session, error } = await requirePro(req);
  if (error || !session) return error!;

  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE portfolio_shares SET is_active = 0 WHERE user_id = ?",
    args: [session.userId],
  });

  await trackEvent(session.userId, "portfolio_share_revoked");
  return NextResponse.json({ ok: true });
});

/**
 * GET /api/portfolio/share — get current share info (Pro only)
 */
export const GET = withMetrics("/api/portfolio/share GET", async (req: NextRequest) => {
  const { session, error } = await requirePro(req);
  if (error || !session) return error!;

  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT id, is_active, show_values, excluded_tickers FROM portfolio_shares WHERE user_id = ?",
    args: [session.userId],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ share: null });
  }

  const row = result.rows[0];
  return NextResponse.json({
    share: {
      token: row.id as string,
      isActive: Boolean(row.is_active),
      showValues: Boolean(row.show_values),
      excludedTickers: JSON.parse((row.excluded_tickers as string) || "[]"),
    },
  });
});
