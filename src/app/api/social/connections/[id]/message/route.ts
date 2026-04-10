import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
  getConnectionBetween,
  findOrCreateDirectRoom,
  trackEvent,
  createNotification,
  findUserById,
} from "@/lib/db";

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

  const { roomId, shouldNotifyInvitee } = await findOrCreateDirectRoom(session.userId, targetUserId);

  if (shouldNotifyInvitee) {
    const inviter = await findUserById(session.userId);
    const name = inviter?.display_name?.trim() || "Someone";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    const link = `${baseUrl}/network/conversations?chat=${encodeURIComponent(roomId)}`;
    await createNotification(targetUserId, {
      type: "info",
      title: `${name} invited you to chat`,
      titleEs: `${name} te invitó a chatear`,
      message: "Accept the invitation to open the conversation.",
      messageEs: "Acepta la invitación para abrir la conversación.",
      link,
      linkLabel: "View invitation",
      linkLabelEs: "Ver invitación",
    }).catch(() => {});
  }

  await trackEvent(session.userId, "social_message_start", { connectionId }).catch(() => {});

  return NextResponse.json({ token: roomId });
}
