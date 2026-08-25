export type EngagementSegment = "engaged" | "warm" | "dormant" | "churned" | "never_active";

export interface UserActivityRow {
  userId: string;
  username: string;
  email: string;
  plan: string;
  lastEventAt: string | null;
  eventCountInWindow: number;
  distinctEventTypes: number;
  createdAt: string;
}

export function daysSince(iso: string | null, nowMs = Date.now()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (nowMs - t) / (24 * 60 * 60 * 1000);
}

/**
 * Classify a user by last analytics event age.
 * - engaged: last event ≤ 7d
 * - warm: 8–30d
 * - dormant: 31–90d
 * - churned: > 90d (had activity ever)
 * - never_active: no events recorded
 */
export function classifySegment(lastEventAt: string | null, nowMs = Date.now()): EngagementSegment {
  const d = daysSince(lastEventAt, nowMs);
  if (d === null) return "never_active";
  if (d <= 7) return "engaged";
  if (d <= 30) return "warm";
  if (d <= 90) return "dormant";
  return "churned";
}

export function isPowerUser(row: UserActivityRow, engagedPeers: UserActivityRow[]): boolean {
  if (classifySegment(row.lastEventAt) !== "engaged") return false;
  if (engagedPeers.length === 0) return false;
  const sorted = [...engagedPeers].sort((a, b) => b.eventCountInWindow - a.eventCountInWindow);
  const cutoffIdx = Math.max(0, Math.ceil(sorted.length * 0.1) - 1);
  const threshold = sorted[cutoffIdx]?.eventCountInWindow ?? Number.POSITIVE_INFINITY;
  return row.eventCountInWindow >= threshold && row.eventCountInWindow >= 10;
}
