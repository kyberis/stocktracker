import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { createPrivateChatRoom, listPrivateChatRooms } from "@/lib/db";

export const GET = withMetrics("/api/admin/chats", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error || !session) return error!;

  const rooms = await listPrivateChatRooms(session.userId);
  return NextResponse.json(rooms);
});

export const POST = withMetrics("/api/admin/chats", async (req: NextRequest) => {
  const { session, error } = await requireAdmin(req);
  if (error || !session) return error!;

  let label = "";
  try {
    const body = await req.json();
    label = typeof body.label === "string" ? body.label.trim() : "";
  } catch {
    // empty body is fine, label stays ""
  }

  const room = await createPrivateChatRoom(session.userId, label);
  const url = `${new URL(req.url).origin}/chat/${room.id}`;

  return NextResponse.json({ ...room, url }, { status: 201 });
});
