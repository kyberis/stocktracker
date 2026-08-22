"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  AGENT_INTRO_EXPERIMENT_KEY,
  isAgentIntroEngagementReady,
  markAgentIntroEngagementReady,
  markAgentIntroPostActionRecorded,
  hasAgentIntroPostActionRecorded,
} from "@/lib/agent-intro";
import { trackExperimentEvent, useExperiment } from "@/lib/use-experiment";

/**
 * Records the primary success metric for `agent_intro`: first meaningful home action
 * after the splash (treatment) or on first home load (control).
 */
export function useAgentIntroPostAction({
  enabled,
  isEmpty,
  engagementReady,
}: {
  enabled: boolean;
  isEmpty: boolean;
  engagementReady: boolean;
}) {
  const experiment = useExperiment(AGENT_INTRO_EXPERIMENT_KEY, {
    enabled: enabled && engagementReady,
  });
  const recordedRef = useRef(hasAgentIntroPostActionRecorded());

  useEffect(() => {
    recordedRef.current = hasAgentIntroPostActionRecorded();
  }, [engagementReady]);

  const recordPostIntroAction = useCallback(
    (action: string) => {
      if (!enabled || !engagementReady || recordedRef.current) return;
      if (experiment.status !== "running" && !experiment.previewing) return;
      if (hasAgentIntroPostActionRecorded()) {
        recordedRef.current = true;
        return;
      }

      recordedRef.current = true;
      markAgentIntroPostActionRecorded();
      void trackExperimentEvent("agent_intro_post_action", {
        experiment: AGENT_INTRO_EXPERIMENT_KEY,
        variant: experiment.variant,
        dest: isEmpty ? "empty" : "portfolio",
        action: action.slice(0, 64),
      });
    },
    [enabled, engagementReady, experiment.previewing, experiment.status, experiment.variant, isEmpty],
  );

  return { recordPostIntroAction };
}

/** Control arm: engagement window opens immediately once assigned while running. */
export function useAgentIntroEngagementReady({
  enabled,
  introDismissed,
  variant,
  status,
  assigned,
  loading,
}: {
  enabled: boolean;
  introDismissed: boolean;
  variant: string;
  status: string;
  loading: boolean;
}): boolean {
  useEffect(() => {
    if (!enabled || loading) return;
    if (introDismissed) {
      markAgentIntroEngagementReady();
      return;
    }
    if (status === "running" && assigned && variant === "control") {
      markAgentIntroEngagementReady();
    }
  }, [assigned, enabled, introDismissed, loading, status, variant]);

  if (!enabled) return false;
  if (introDismissed) return isAgentIntroEngagementReady();
  if (!loading && status === "running" && assigned && variant === "control") {
    return true;
  }
  return isAgentIntroEngagementReady();
}
