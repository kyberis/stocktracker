import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { listUserChatRooms } from "@/lib/db";

export const GET = withMetrics("/api/chats", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const rooms = await listUserChatRooms(session.userId);
  return NextResponse.json(rooms);
});
