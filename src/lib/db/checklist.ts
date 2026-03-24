import { ensureInitialized } from "./client";
import { str } from "./helpers";

export type ChecklistStep =
  | "complete_profile"
  | "add_stock"
  | "create_alert"
  | "explore_tools";

export const ALL_CHECKLIST_STEPS: ChecklistStep[] = [
  "complete_profile",
  "add_stock",
  "create_alert",
  "explore_tools",
];

export interface ChecklistState {
  steps: { step: ChecklistStep; completedAt: string | null }[];
  dismissed: boolean;
}

export async function getChecklistState(userId: string): Promise<ChecklistState> {
  const client = await ensureInitialized();
  const [stepsResult, userResult] = await Promise.all([
    client.execute({
      sql: "SELECT step, completed_at FROM onboarding_checklist WHERE user_id = ?",
      args: [userId],
    }),
    client.execute({
      sql: "SELECT checklist_dismissed_at FROM users WHERE id = ?",
      args: [userId],
    }),
  ]);

  const completedMap = new Map<string, string>();
  for (const row of stepsResult.rows) {
    completedMap.set(str(row.step), str(row.completed_at));
  }

  const dismissed = !!(userResult.rows[0] && str(userResult.rows[0].checklist_dismissed_at));

  return {
    steps: ALL_CHECKLIST_STEPS.map((step) => ({
      step,
      completedAt: completedMap.get(step) || null,
    })),
    dismissed,
  };
}

export async function completeChecklistStep(userId: string, step: ChecklistStep): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `INSERT OR IGNORE INTO onboarding_checklist (user_id, step) VALUES (?, ?)`,
    args: [userId, step],
  });
}

export async function dismissChecklist(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "UPDATE users SET checklist_dismissed_at = datetime('now') WHERE id = ?",
    args: [userId],
  });
}

export async function resetChecklist(userId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.batch([
    { sql: "DELETE FROM onboarding_checklist WHERE user_id = ?", args: [userId] },
    { sql: "UPDATE users SET checklist_dismissed_at = NULL WHERE id = ?", args: [userId] },
  ]);
}

export async function autoDetectCompletedSteps(userId: string): Promise<void> {
  const client = await ensureInitialized();

  const [profileResult, holdingsResult, alertsResult] = await Promise.all([
    client.execute({
      sql: "SELECT display_name, tax_residency, experience_level FROM users WHERE id = ?",
      args: [userId],
    }),
    client.execute({
      sql: "SELECT COUNT(*) as cnt FROM holdings WHERE user_id = ?",
      args: [userId],
    }),
    client.execute({
      sql: "SELECT COUNT(*) as cnt FROM price_alerts WHERE user_id = ?",
      args: [userId],
    }),
  ]);

  const user = profileResult.rows[0];
  if (user && (str(user.display_name) || str(user.tax_residency) || str(user.experience_level))) {
    await completeChecklistStep(userId, "complete_profile");
  }

  const holdingsCount = Number(holdingsResult.rows[0]?.cnt ?? 0);
  if (holdingsCount > 0) {
    await completeChecklistStep(userId, "add_stock");
  }

  const alertsCount = Number(alertsResult.rows[0]?.cnt ?? 0);
  if (alertsCount > 0) {
    await completeChecklistStep(userId, "create_alert");
  }
}
