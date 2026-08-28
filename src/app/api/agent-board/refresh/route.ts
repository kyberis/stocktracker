import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabledForUser } from "@/lib/db";
import { runAgentBoardForUser } from "@/lib/agent-board/run-user";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = withMetrics("/api/agent-board/refresh", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const platformEnabled = await isFeatureEnabledForUser("agent_board_enabled", session.userId);
  if (!platformEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const result = await runAgentBoardForUser(session.userId);
  if (result.reason === "disabled") {
    return NextResponse.json({ error: "Pizarra disabled" }, { status: 403 });
  }

  return NextResponse.json(result);
});
