/**
 * Client-side-only failure signal for the three import paths (broker sync,
 * CSV, AI), sent to the DB-backed analytics pipeline (not Google Analytics —
 * see useTrack()) so drop-off inside the import flow is actually visible.
 * Reasons are a bounded, enumerated slug set, never raw error text, to stay
 * under the tracking endpoint's metadata length cap and keep the data
 * queryable.
 */
export function trackImportError(
  method: "broker_sync" | "csv" | "ai",
  reason: string,
  extra?: Record<string, string>,
): void {
  try {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "import_error",
        metadata: { method, reason, ...extra },
      }),
    })?.catch(() => {});
  } catch {
    // never let telemetry break the caller
  }
}
