"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getExperimentPreview,
  subscribeExperimentPreview,
} from "@/lib/experiment-preview";

export type ExperimentStatus = "draft" | "running" | "paused" | "archived";

export interface ExperimentResolve {
  key: string;
  status: ExperimentStatus;
  variant: string;
  metrics: string[];
  assigned: boolean;
  loading: boolean;
  /** True when variant comes from admin preview override (not sticky assignment). */
  previewing: boolean;
}

/**
 * Resolve a sticky experiment variant for the signed-in user.
 * When the experiment is not running (or fetch fails), returns control.
 * Order: options.forceVariant → sessionStorage preview → API.
 */
export function useExperiment(
  experimentKey: string,
  options?: { enabled?: boolean; forceVariant?: string },
): ExperimentResolve {
  const enabled = options?.enabled !== false;
  const forceVariant = options?.forceVariant;

  const resolveForced = useCallback((): { variant: string; previewing: boolean } | null => {
    if (forceVariant) return { variant: forceVariant, previewing: false };
    const preview = getExperimentPreview(experimentKey);
    if (preview) return { variant: preview, previewing: true };
    return null;
  }, [experimentKey, forceVariant]);

  const initialForced = resolveForced();

  const [state, setState] = useState<ExperimentResolve>({
    key: experimentKey,
    status: "draft",
    variant: initialForced?.variant || "control",
    metrics: [],
    assigned: false,
    loading: enabled && !initialForced,
    previewing: Boolean(initialForced?.previewing),
  });

  const load = useCallback(async () => {
    const forced = resolveForced();
    if (!enabled || forced) {
      setState({
        key: experimentKey,
        status: "draft",
        variant: forced?.variant || "control",
        metrics: [],
        assigned: false,
        loading: false,
        previewing: Boolean(forced?.previewing),
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, key: experimentKey, previewing: false }));
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
      // Preview may have been set while the request was in flight
      const lateForced = resolveForced();
      if (lateForced) {
        setState({
          key: experimentKey,
          status: "draft",
          variant: lateForced.variant,
          metrics: [],
          assigned: false,
          loading: false,
          previewing: lateForced.previewing,
        });
        return;
      }
      setState({
        key: payload.key || experimentKey,
        status: (payload.status as ExperimentStatus) || "draft",
        variant: payload.variant || "control",
        metrics: payload.metrics || [],
        assigned: Boolean(payload.assigned),
        loading: false,
        previewing: false,
      });
    } catch {
      setState({
        key: experimentKey,
        status: "draft",
        variant: "control",
        metrics: [],
        assigned: false,
        loading: false,
        previewing: false,
      });
    }
  }, [enabled, experimentKey, resolveForced]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeExperimentPreview(() => {
      void load();
    });
  }, [load]);

  return state;
}

/** Fire-and-forget first-party track for experiment CTAs. */
export async function trackExperimentEvent(
  event: string,
  metadata?: Record<string, string>,
): Promise<void> {
  const experimentKey = metadata?.experiment;
  if (experimentKey && getExperimentPreview(experimentKey)) {
    // Admin QA preview — do not inflate conversion metrics
    return;
  }
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
