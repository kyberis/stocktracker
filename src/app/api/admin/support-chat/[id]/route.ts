import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getSupportChatConversation, updateSupportChatStatus } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/support-chat/[id]", async (
  req: NextRequest,
  ctx?: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = (ctx as { params: { id: string } }).params;
  const conversation = await getSupportChatConversation(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  return NextResponse.json({ conversation });
});

export const PUT = withMetrics("/api/admin/support-chat/[id]", async (
  req: NextRequest,
  ctx?: unknown,
) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { id } = (ctx as { params: { id: string } }).params;
  const body = await req.json();
  const status = body.status;
  if (!status || !["active", "resolved", "escalated"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await updateSupportChatStatus(id, status);
  if (!updated) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, status });
});
