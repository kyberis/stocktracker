import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";
import type { RebalanceTarget } from "@/lib/types";

export async function listRebalanceTargets(userId: string): Promise<RebalanceTarget[]> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "SELECT * FROM rebalance_targets WHERE user_id = ? ORDER BY category, label", args: [userId] });
  return result.rows.map((r) => ({ id: str(r.id), category: str(r.category), label: str(r.label), targetPercent: num(r.target_percent) }));
}

export async function setRebalanceTarget(userId: string, target: Omit<RebalanceTarget, "id">): Promise<RebalanceTarget> {
  const client = await ensureInitialized();
  const existing = await client.execute({
    sql: "SELECT id FROM rebalance_targets WHERE user_id = ? AND category = ? AND label = ?",
    args: [userId, target.category, target.label],
  });
  if (existing.rows.length > 0) {
    const id = str(existing.rows[0].id);
    await client.execute({ sql: "UPDATE rebalance_targets SET target_percent = ? WHERE id = ?", args: [target.targetPercent, id] });
    return { id, ...target };
  }
  const id = randomUUID();
  await client.execute({
    sql: "INSERT INTO rebalance_targets (id, user_id, category, label, target_percent) VALUES (?, ?, ?, ?, ?)",
    args: [id, userId, target.category, target.label, target.targetPercent],
  });
  return { id, ...target };
}

export async function deleteRebalanceTarget(userId: string, targetId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({ sql: "DELETE FROM rebalance_targets WHERE id = ? AND user_id = ?", args: [targetId, userId] });
  return (result.rowsAffected ?? 0) > 0;
}
