import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { removeParticipantFromAdminLinkRoom } from "@/lib/db";

export const DELETE = withMetrics(
  "/api/admin/chats/[id]/participants/[userId]",
  async (req: NextRequest, ctx?: unknown) => {
    const { session, error } = await requireAdmin(req);
    if (error || !session) return error!;

    const { id: roomId, userId: targetUserId } = await (ctx as { params: Promise<{ id: string; userId: string }> })
      .params;
    if (!roomId || !targetUserId) {
      return NextResponse.json({ error: "Missing room or user id" }, { status: 400 });
    }

    const ok = await removeParticipantFromAdminLinkRoom(roomId, targetUserId, session.userId);
    if (!ok) {
      return NextResponse.json({ error: "Could not remove participant" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }
);
