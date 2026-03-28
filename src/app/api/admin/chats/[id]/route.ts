import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { deactivatePrivateChatRoom } from "@/lib/db";

export const DELETE = withMetrics(
  "/api/admin/chats/[id]",
  async (req: NextRequest) => {
    const { session, error } = await requireAdmin(req);
    if (error || !session) return error!;

    const id = req.nextUrl.pathname.split("/").pop() || "";
    if (!id) {
      return NextResponse.json({ error: "Missing room id" }, { status: 400 });
    }

    const ok = await deactivatePrivateChatRoom(id);
    if (!ok) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }
);
