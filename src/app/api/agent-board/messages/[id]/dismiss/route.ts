import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { dismissAgentBoardMessage } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const POST = withMetrics(
  "/api/agent-board/messages/[id]/dismiss",
  async (req: NextRequest, ctx?: unknown) => {
    const { session, error } = await requireSession(req);
    if (error || !session) return error;

    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const ok = await dismissAgentBoardMessage(session.userId, id);
    return NextResponse.json({ ok });
  },
);
