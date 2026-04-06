import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getConnectionBetween, findOrCreateDirectRoom, trackEvent } from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: connectionId } = await params;
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const body = await request.json().catch(() => ({}));
  const { targetUserId } = body;

  if (!targetUserId) return NextResponse.json({ error: "Target user required" }, { status: 400 });

  const connection = await getConnectionBetween(session.userId, targetUserId);
  if (!connection || connection.status !== "accepted") {
    return NextResponse.json({ error: "You must be connected to message this user" }, { status: 403 });
  }

  const token = await findOrCreateDirectRoom(session.userId, targetUserId);
  await trackEvent(session.userId, "social_message_start", { connectionId }).catch(() => {});

  return NextResponse.json({ token });
}
