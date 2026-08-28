import {
  countAgentBoardMessagesToday,
  getUserSettings,
  isFeatureEnabled,
  listAgentBoardCronCandidates,
  listAgentBoardMessagesForComposer,
  purgeExpiredAgentBoardMessages,
} from "@/lib/db";
import { collectAgentBoardSignals } from "@/lib/agent-board/collect-signals";
import { composeAgentBoardMessages, persistComposedMessages } from "@/lib/agent-board/compose-messages";
import { withCronLogging } from "@/lib/cron-logging";
import { isTestAccountEmail } from "@/lib/email";

const CONCURRENCY = 3;
const MAX_MESSAGES_PER_DAY = 5;

async function processUser(userId: string, email: string): Promise<"ok" | "skip" | "error"> {
  try {
    if (isTestAccountEmail(email)) return "skip";

    const settings = await getUserSettings(userId);
    if (!settings.agentBoardEnabled) return "skip";

    const todayCount = await countAgentBoardMessagesToday(userId);
    if (todayCount >= MAX_MESSAGES_PER_DAY) return "skip";

    const signals = await collectAgentBoardSignals({ userId });
    if (signals.length === 0) return "skip";

    const history = await listAgentBoardMessagesForComposer(userId, 15);
    const composed = await composeAgentBoardMessages({
      userId,
      language: settings.language,
      signals,
      history,
    });

    const remaining = MAX_MESSAGES_PER_DAY - todayCount;
    const toPersist = composed.slice(0, remaining);
    await persistComposedMessages(userId, toPersist);
    return "ok";
  } catch (e) {
    console.error(`[agent-board] user=${userId}`, e);
    return "error";
  }
}

export async function executeAgentBoardCron(): Promise<Record<string, unknown>> {
  if (!(await isFeatureEnabled("agent_board_enabled"))) {
    return { processed: 0, disabled: true };
  }

  const purged = await purgeExpiredAgentBoardMessages();
  const candidates = await listAgentBoardCronCandidates(7);
  let ok = 0;
  let skip = 0;
  let error = 0;

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((c) => processUser(c.userId, c.email)));
    for (const r of results) {
      if (r === "ok") ok += 1;
      else if (r === "error") error += 1;
      else skip += 1;
    }
  }

  return { candidates: candidates.length, ok, skip, error, purged };
}

export const runAgentBoardCron = withCronLogging("agent-board", executeAgentBoardCron);
