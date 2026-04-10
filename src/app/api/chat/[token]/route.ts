import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import {
  getPrivateChatRoom,
  getPrivateChatMessages,
  joinPrivateChatRoom,
  getPrivateChatParticipants,
  getParticipantMembership,
  updateLastSeen,
  getReactionsForRoom,
} from "@/lib/db";

export const GET = withMetrics(
  "/api/chat/[token]",
  async (req: NextRequest, ctx?: unknown) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const { token } = await (ctx as { params: Promise<{ token: string }> }).params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const room = await getPrivateChatRoom(token);
  if (!room) {
    return NextResponse.json({ error: "Chat not found or has been disabled" }, { status: 404 });
  }

  if (room.kind === "admin_link") {
    const joinResult = await joinPrivateChatRoom(token, session.userId);
    if (joinResult === "full") {
      return NextResponse.json(
        { error: "This chat already has two participants" },
        { status: 403 }
      );
    }
  } else {
    const membership = await getParticipantMembership(token, session.userId);
    if (membership === null) {
      return NextResponse.json({ error: "You do not have access to this chat" }, { status: 403 });
    }
    if (membership === "pending") {
      const participants = await getPrivateChatParticipants(token);
      const inviter = participants.find(
        (p) => p.userId !== session.userId && p.membershipStatus === "active"
      );
      return NextResponse.json({
        room,
        membership: "pending" as const,
        participants,
        messages: [],
        reactions: {},
        inviter: inviter
          ? {
              userId: inviter.userId,
              displayName: inviter.displayName,
              avatarUrl: inviter.avatarUrl,
            }
          : null,
      });
    }
  }

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

  return NextResponse.json({
    room,
    membership: "active" as const,
    messages,
    participants,
    reactions,
  });
  }
);
