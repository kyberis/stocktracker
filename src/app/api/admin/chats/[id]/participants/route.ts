import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { getPrivateChatRoom, getPrivateChatParticipants } from "@/lib/db";

export const GET = withMetrics(
  "/api/admin/chats/[id]/participants",
  async (req: NextRequest, ctx?: unknown) => {
    const { session, error } = await requireAdmin(req);
    if (error || !session) return error!;

    const { id: roomId } = await (ctx as { params: Promise<{ id: string }> }).params;
    if (!roomId) {
      return NextResponse.json({ error: "Missing room id" }, { status: 400 });
    }

    const room = await getPrivateChatRoom(roomId);
    if (!room || room.createdBy !== session.userId || room.kind !== "admin_link") {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const participants = await getPrivateChatParticipants(roomId);
    return NextResponse.json({ participants });
  }
);
