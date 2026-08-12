/**
 * Fire-and-forget display-invariant telemetry. Never throws; never blocks render.
 * Dedupes by session fingerprint + once per page load.
 */

import {
  DISPLAY_INVARIANT_EVENT,
  displayInvariantTelemetryMetadata,
  fingerprintViolations,
  type DisplayInvariantViolation,
} from "./display-invariants";

const STORAGE_KEY = "trefolio:display_invariants:fp";

let reportedThisLoad = false;

export function resetDisplayInvariantReportStateForTests(): void {
  reportedThisLoad = false;
}

export function reportDisplayInvariantViolations(
  violations: DisplayInvariantViolation[],
  surface: string,
  holdingCount: number,
): void {
  if (violations.length === 0) return;
  if (typeof window === "undefined") return;
  if (reportedThisLoad) return;

  const fp = fingerprintViolations(violations);
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY) === fp) return;
  } catch {
    // private mode / blocked storage — still report once this load
  }

  reportedThisLoad = true;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, fp);
  } catch {
    /* ignore */
  }

  const metadata = displayInvariantTelemetryMetadata(violations, surface, holdingCount);
  try {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        event: DISPLAY_INVARIANT_EVENT,
        metadata,
      }),
    })?.catch(() => {});
  } catch {
    // never let telemetry break the caller
  }
}
