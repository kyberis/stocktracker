import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { getPrivateChatRoom, clearChatForUser } from "@/lib/db";

export const DELETE = withMetrics("/api/chat/[token]/clear", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const segments = req.nextUrl.pathname.split("/");
  const token = segments[segments.length - 2] || "";
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const room = await getPrivateChatRoom(token);
  if (!room) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  await clearChatForUser(token, session.userId);

  return NextResponse.json({ ok: true });
});
