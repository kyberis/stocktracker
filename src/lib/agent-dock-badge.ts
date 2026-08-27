/** Badge label for the agent-dock alerts chip. Null when there is nothing to show. */
export function formatAgentDockAlertBadge(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  const n = Math.floor(count);
  return n > 9 ? "9+" : String(n);
}
