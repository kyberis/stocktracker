import { ensureInitialized } from "./client";

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

export async function getLastAidVisitAt(userId: string): Promise<string | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT last_aid_visit_at FROM user_settings WHERE user_id = ?",
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  const raw = str(result.rows[0].last_aid_visit_at);
  return raw || null;
}

export async function setLastAidVisitAt(userId: string, iso: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE user_settings SET last_aid_visit_at = ? WHERE user_id = ?",
    args: [iso, userId],
  });
}

export async function getAidWarrenNudgeDate(userId: string): Promise<string> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT aid_warren_nudge_date FROM user_settings WHERE user_id = ?",
    args: [userId],
  });
  if (result.rows.length === 0) return "";
  return str(result.rows[0].aid_warren_nudge_date);
}

export async function setAidWarrenNudgeDate(userId: string, date: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE user_settings SET aid_warren_nudge_date = ? WHERE user_id = ?",
    args: [date, userId],
  });
}
