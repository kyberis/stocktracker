import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listSupportChatConversations } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";
import type { SupportChatStatus } from "@/lib/db";

export const GET = withMetrics("/api/admin/support-chat", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "all") as SupportChatStatus | "all";
  const userId = url.searchParams.get("userId") || undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

  const result = await listSupportChatConversations({ status, userId, limit, offset });
  return NextResponse.json(result);
});
