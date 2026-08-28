import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import {
  countAgentBoardMessagesToday,
  getUserSettings,
  isFeatureEnabledForUser,
  listAgentBoardMessagesForComposer,
} from "@/lib/db";
import { collectAgentBoardSignals } from "@/lib/agent-board/collect-signals";
import { composeAgentBoardMessages, persistComposedMessages } from "@/lib/agent-board/compose-messages";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_MESSAGES_PER_DAY = 5;

export const POST = withMetrics("/api/agent-board/refresh", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const platformEnabled = await isFeatureEnabledForUser("agent_board_enabled", session.userId);
  if (!platformEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const settings = await getUserSettings(session.userId);
  if (!settings.agentBoardEnabled) {
    return NextResponse.json({ error: "Pizarra disabled" }, { status: 403 });
  }

  const todayCount = await countAgentBoardMessagesToday(session.userId);
  if (todayCount >= MAX_MESSAGES_PER_DAY) {
    return NextResponse.json({ inserted: 0, reason: "daily_cap" });
  }

  const signals = await collectAgentBoardSignals({ userId: session.userId });
  if (signals.length === 0) {
    return NextResponse.json({ inserted: 0, reason: "no_signals" });
  }

  const history = await listAgentBoardMessagesForComposer(session.userId, 15);
  const composed = await composeAgentBoardMessages({
    userId: session.userId,
    language: settings.language,
    signals,
    history,
  });

  const remaining = MAX_MESSAGES_PER_DAY - todayCount;
  const inserted = await persistComposedMessages(
    session.userId,
    composed.slice(0, remaining),
  );

  return NextResponse.json({ inserted });
});
