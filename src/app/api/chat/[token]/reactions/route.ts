import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { getPrivateChatRoom, toggleReaction, getReactionsForRoom } from "@/lib/db";

function extractToken(pathname: string): string {
  const segments = pathname.split("/");
  return segments[segments.indexOf("chat") + 1] || "";
}

export const POST = withMetrics(
  "/api/chat/[token]/reactions",
  async (req: NextRequest) => {
    const { session, error } = await requireSession(req);
    if (error || !session) return error!;

    const token = extractToken(req.nextUrl.pathname);
    if (!token || token.length < 8) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const room = await getPrivateChatRoom(token);
    if (!room) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    let body: { messageId?: string; emoji?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { messageId, emoji } = body;
    if (!messageId || !emoji || typeof emoji !== "string") {
      return NextResponse.json({ error: "messageId and emoji are required" }, { status: 400 });
    }

    const action = await toggleReaction(messageId, session.userId, emoji);
    const reactions = await getReactionsForRoom(token);

    return NextResponse.json({ action, reactions });
  }
);
