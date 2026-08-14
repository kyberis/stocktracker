/**
 * Ops circuit for investment screening provider quota / rate-limits.
 *
 * Source of truth is `platform_settings.screening_provider_circuit`.
 * `screening_new_runs_enabled` is a client-facing mirror so CTAs hide quickly.
 * Server enforcement always reads the circuit JSON, not the flag.
 */

import {
  getScreeningProviderCircuit,
  setFeatureEnabled,
  setScreeningProviderCircuit,
} from "@/lib/db/settings";
import { enqueueProdOpsScreeningProviderQuotaEvent } from "@/lib/prodops";
import type { ScreeningProviderCircuit, ScreeningCircuitProvider } from "@/lib/db/settings";

export type { ScreeningProviderCircuit, ScreeningCircuitProvider };

export function isScreeningProviderQuotaStatus(
  status: number,
  detail = "",
): boolean {
  if (status === 429) return true;
  const lower = detail.toLowerCase();
  return (
    lower.includes("insufficient_quota") ||
    lower.includes("rate limit") ||
    lower.includes("quota exceeded") ||
    lower.includes("quota_exceeded")
  );
}

export async function isScreeningNewRunsAllowed(): Promise<boolean> {
  const circuit = await getScreeningProviderCircuit();
  return !circuit.paused;
}

export async function tripScreeningProviderCircuit(input: {
  provider: ScreeningCircuitProvider;
  statusCode?: number;
  detail?: string;
  trippedBy: "system" | "admin";
}): Promise<ScreeningProviderCircuit> {
  const current = await getScreeningProviderCircuit();
  if (current.paused) return current;

  const trippedAt = new Date().toISOString();
  const generation = (current.generation ?? 0) + 1;
  const next: ScreeningProviderCircuit = {
    paused: true,
    provider: input.provider,
    statusCode: input.statusCode,
    detail: (input.detail ?? "").slice(0, 300),
    trippedAt,
    trippedBy: input.trippedBy,
    generation,
    clearedAt: undefined,
    clearedByUserId: undefined,
  };

  await setScreeningProviderCircuit(next);
  await setFeatureEnabled("screening_new_runs_enabled", false);

  if (input.trippedBy === "system") {
    try {
      await enqueueProdOpsScreeningProviderQuotaEvent({
        provider: next.provider,
        statusCode: next.statusCode,
        detail: next.detail,
        trippedAt,
        generation,
      });
    } catch (err) {
      console.error(
        "[screening/circuit] prodops enqueue failed",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return next;
}

export async function clearScreeningProviderCircuit(
  adminUserId: string,
): Promise<ScreeningProviderCircuit> {
  const current = await getScreeningProviderCircuit();
  const next: ScreeningProviderCircuit = {
    ...current,
    paused: false,
    clearedAt: new Date().toISOString(),
    clearedByUserId: adminUserId,
  };
  await setScreeningProviderCircuit(next);
  await setFeatureEnabled("screening_new_runs_enabled", true);
  return next;
}

/** Fire-and-forget trip from provider clients. No-ops if already paused. */
export function noteScreeningProviderQuota(input: {
  provider: ScreeningCircuitProvider;
  statusCode?: number;
  detail?: string;
}): void {
  if (
    input.statusCode != null &&
    !isScreeningProviderQuotaStatus(input.statusCode, input.detail)
  ) {
    return;
  }
  void tripScreeningProviderCircuit({
    provider: input.provider,
    statusCode: input.statusCode,
    detail: input.detail,
    trippedBy: "system",
  }).catch((err) => {
    console.error(
      "[screening/circuit] trip failed",
      err instanceof Error ? err.message : err,
    );
  });
}
