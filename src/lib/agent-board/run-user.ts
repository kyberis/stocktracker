import {
  countAgentBoardMessagesToday,
  getUserSettings,
  listAgentBoardMessagesForComposer,
} from "@/lib/db";
import { collectAgentBoardSignals } from "@/lib/agent-board/collect-signals";
import { composeAgentBoardMessages, persistComposedMessages } from "@/lib/agent-board/compose-messages";

const MAX_MESSAGES_PER_DAY = 5;

export type AgentBoardRunResult =
  | { inserted: number; reason?: undefined }
  | { inserted: 0; reason: "disabled" | "daily_cap" | "no_signals" };

/**
 * Collect → compose → persist for one opted-in user.
 * Shared by cron and POST /api/agent-board/refresh.
 */
export async function runAgentBoardForUser(userId: string): Promise<AgentBoardRunResult> {
  const settings = await getUserSettings(userId);
  if (!settings.agentBoardEnabled) {
    return { inserted: 0, reason: "disabled" };
  }

  const todayCount = await countAgentBoardMessagesToday(userId);
  if (todayCount >= MAX_MESSAGES_PER_DAY) {
    return { inserted: 0, reason: "daily_cap" };
  }

  const signals = await collectAgentBoardSignals({ userId });
  if (signals.length === 0) {
    return { inserted: 0, reason: "no_signals" };
  }

  const history = await listAgentBoardMessagesForComposer(userId, 15);
  const composed = await composeAgentBoardMessages({
    userId,
    language: settings.language,
    signals,
    history,
  });

  const remaining = MAX_MESSAGES_PER_DAY - todayCount;
  const inserted = await persistComposedMessages(userId, composed.slice(0, remaining));
  return { inserted };
}
