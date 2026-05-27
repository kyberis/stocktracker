const BACKFILL_LOCK_TTL_MS = 5 * 60 * 1000;
const backfillLocks = new Map<string, number>();

export function acquireBackfillLock(userId: string): boolean {
  const now = Date.now();
  const existing = backfillLocks.get(userId);
  if (existing != null && now - existing < BACKFILL_LOCK_TTL_MS) return false;
  backfillLocks.set(userId, now);
  return true;
}

export function releaseBackfillLock(userId: string): void {
  backfillLocks.delete(userId);
}
