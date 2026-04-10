import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { acceptSocialChatInvite, getPrivateChatRoom } from "@/lib/db";

export const POST = withMetrics(
  "/api/chat/[token]/invite/accept",
  async (req: NextRequest, ctx?: unknown) => {
    const { session, error } = await requireSession(req);
    if (error || !session) return error!;

    const { token } = await (ctx as { params: Promise<{ token: string }> }).params;
    if (!token || token.length < 8) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const room = await getPrivateChatRoom(token);
    if (!room) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const ok = await acceptSocialChatInvite(token, session.userId);
    if (!ok) {
      return NextResponse.json({ error: "No pending invitation for this chat" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }
);
