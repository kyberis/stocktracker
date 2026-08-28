import {
  isFeatureEnabled,
  listAgentBoardCronCandidates,
  purgeExpiredAgentBoardMessages,
} from "@/lib/db";
import { runAgentBoardForUser } from "@/lib/agent-board/run-user";
import { withCronLogging } from "@/lib/cron-logging";
import { isTestAccountEmail } from "@/lib/email";

const CONCURRENCY = 3;

async function processUser(userId: string, email: string): Promise<"ok" | "skip" | "error"> {
  try {
    if (isTestAccountEmail(email)) return "skip";
    const result = await runAgentBoardForUser(userId);
    return result.inserted > 0 ? "ok" : "skip";
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
