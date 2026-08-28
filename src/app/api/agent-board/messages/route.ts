import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
  isFeatureEnabledForUser,
  listAgentBoardMessages,
  getUserSettings,
} from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/agent-board/messages", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const enabled = await isFeatureEnabledForUser("agent_board_enabled", session.userId);
  if (!enabled) {
    return NextResponse.json({ enabled: false, messages: [] });
  }

  const settings = await getUserSettings(session.userId);
  if (!settings.agentBoardEnabled) {
    return NextResponse.json({ enabled: false, messages: [] });
  }

  const messages = await listAgentBoardMessages(session.userId, 15);
  return NextResponse.json({
    enabled: true,
    messages: messages.map((m) => ({
      id: m.id,
      agent: m.agent,
      kind: m.kind,
      body: m.body,
      chipLabel: m.chipLabel,
      chipPrompt: m.chipPrompt,
      priority: m.priority,
      readAt: m.readAt,
      createdAt: m.createdAt,
    })),
  });
});
