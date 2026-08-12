"use client";

import { useCallback, useEffect, useState } from "react";

export type ExperimentStatus = "draft" | "running" | "paused" | "archived";

export interface ExperimentResolve {
  key: string;
  status: ExperimentStatus;
  variant: string;
  metrics: string[];
  assigned: boolean;
  loading: boolean;
}

/**
 * Resolve a sticky experiment variant for the signed-in user.
 * When the experiment is not running (or fetch fails), returns control.
 */
export function useExperiment(
  experimentKey: string,
  options?: { enabled?: boolean; forceVariant?: string },
): ExperimentResolve {
  const enabled = options?.enabled !== false;
  const forceVariant = options?.forceVariant;

  const [state, setState] = useState<ExperimentResolve>({
    key: experimentKey,
    status: "draft",
    variant: forceVariant || "control",
    metrics: [],
    assigned: false,
    loading: enabled && !forceVariant,
  });

  const load = useCallback(async () => {
    if (!enabled || forceVariant) {
      setState({
        key: experimentKey,
        status: "draft",
        variant: forceVariant || "control",
        metrics: [],
        assigned: false,
        loading: false,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, key: experimentKey }));
    try {
      const res = await fetch(`/api/experiments/${encodeURIComponent(experimentKey)}`);
      if (!res.ok) throw new Error("failed");
      const payload = (await res.json()) as {
        key?: string;
        status?: ExperimentStatus;
        variant?: string;
        metrics?: string[];
        assigned?: boolean;
      };
      setState({
        key: payload.key || experimentKey,
        status: (payload.status as ExperimentStatus) || "draft",
        variant: payload.variant || "control",
        metrics: payload.metrics || [],
        assigned: Boolean(payload.assigned),
        loading: false,
      });
    } catch {
      setState({
        key: experimentKey,
        status: "draft",
        variant: "control",
        metrics: [],
        assigned: false,
        loading: false,
      });
    }
  }, [enabled, experimentKey, forceVariant]);

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}

/** Fire-and-forget first-party track for experiment CTAs. */
export async function trackExperimentEvent(
  event: string,
  metadata?: Record<string, string>,
): Promise<void> {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, metadata }),
      keepalive: true,
    });
  } catch {
    // Analytics must not break UX
  }
}
