import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
  generateWidgetToken,
  revokeWidgetToken,
  listWidgetTokens,
  getLatestValidWidgetToken,
  userHasActiveWidgetToken,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/widget-token", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const token = await generateWidgetToken(session.userId);
  return NextResponse.json({ token });
});

export const DELETE = withMetrics("/api/widget-token", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  let tokenId: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body.id === "string" && body.id.trim()) {
      tokenId = body.id.trim();
    }
  } catch {
    // No JSON body — revoke all active tokens.
  }

  await revokeWidgetToken(session.userId, tokenId);
  return NextResponse.json({ ok: true });
});

export const GET = withMetrics("/api/widget-token", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const [tokens, latestToken, hasToken] = await Promise.all([
    listWidgetTokens(session.userId),
    getLatestValidWidgetToken(session.userId),
    userHasActiveWidgetToken(session.userId),
  ]);

  return NextResponse.json({
    hasToken,
    latestToken,
    tokens: tokens.filter((t) => !t.revokedAt),
  });
});
