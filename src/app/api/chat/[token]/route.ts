import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { getPrivateChatRoom, getPrivateChatMessages, joinPrivateChatRoom, getPrivateChatParticipants, updateLastSeen, getReactionsForRoom } from "@/lib/db";

export const GET = withMetrics("/api/chat/[token]", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const token = req.nextUrl.pathname.split("/").pop() || "";
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const room = await getPrivateChatRoom(token);
  if (!room) {
    return NextResponse.json({ error: "Chat not found or has been disabled" }, { status: 404 });
  }

  await joinPrivateChatRoom(token, session.userId);

  const afterId = req.nextUrl.searchParams.get("after") || undefined;
  const lastRead = req.nextUrl.searchParams.get("lastRead") || undefined;

  await updateLastSeen(token, session.userId, lastRead);

  const participants = await getPrivateChatParticipants(token);
  const me = participants.find((p) => p.userId === session.userId);
  const clearedAt = me?.clearedAt || undefined;

  const [messages, reactions] = await Promise.all([
    getPrivateChatMessages(token, afterId, clearedAt),
    getReactionsForRoom(token),
  ]);

  return NextResponse.json({ room, messages, participants, reactions });
});
