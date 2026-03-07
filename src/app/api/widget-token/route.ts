import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { generateWidgetToken, revokeWidgetToken, findUserById } from "@/lib/db";
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

  await revokeWidgetToken(session.userId);
  return NextResponse.json({ ok: true });
});

export const GET = withMetrics("/api/widget-token", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const user = await findUserById(session.userId);
  return NextResponse.json({ hasToken: !!user?.widget_token_hash });
});
