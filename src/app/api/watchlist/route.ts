import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listWatchlist, addWatchlistItem, removeWatchlistItem } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import { parseBody } from "@/lib/api-response";
import { addWatchlistSchema } from "@/lib/schemas";

export const GET = withMetrics("/api/watchlist", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;
  return NextResponse.json(await listWatchlist(session.userId));
});

export const POST = withMetrics("/api/watchlist", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, addWatchlistSchema);
  if (!result.success) return result.error;
  const item = await addWatchlistItem(session.userId, result.data);
  return NextResponse.json(item, { status: 201 });
});

export const DELETE = withMetrics("/api/watchlist", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const deleted = await removeWatchlistItem(session.userId, id);
  if (!deleted) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
