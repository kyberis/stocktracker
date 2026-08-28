import { ensureInitialized } from "@/lib/db/client";
import { getChatLinkByUserId } from "@/lib/db/telegram";
import { str } from "@/lib/db/helpers";

const WARREN_SOURCES = [
  "warren_chat",
  "warren_telegram",
  "warren_office",
  "warren_clara_sister",
] as const;

/**
 * True when the user already used Warren as a distinct product
 * (chat log or legacy Warren Telegram link). New Clover-only users stay false.
 */
export async function userHasWarren(userId: string): Promise<boolean> {
  if (!userId) return false;

  const link = await getChatLinkByUserId(userId);
  if (link) return true;

  const db = await ensureInitialized();
  const placeholders = WARREN_SOURCES.map(() => "?").join(", ");
  const result = await db.execute({
    sql: `SELECT 1 AS ok FROM ai_logs WHERE user_id = ? AND source IN (${placeholders}) LIMIT 1`,
    args: [userId, ...WARREN_SOURCES],
  });
  return result.rows.length > 0 && Boolean(str(result.rows[0].ok) || result.rows[0].ok === 1);
}
