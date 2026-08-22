"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AGENT_INTRO_EXPERIMENT_KEY,
  isAgentIntroTreatment,
  markAgentIntroEngagementReady,
  prefersReducedMotionIntro,
  resetAgentIntroEngagementSession,
} from "@/lib/agent-intro";
import { trackExperimentEvent, useExperiment } from "@/lib/use-experiment";

const AgentIntroConvergence = dynamic(() => import("./AgentIntroConvergence"), { ssr: false });
const AgentIntroBriefing = dynamic(() => import("./AgentIntroBriefing"), { ssr: false });

/**
 * A/B gate for Warren + Clara home intro (`agent_intro` experiment).
 * Control: no overlay. Treatments: full-screen intro on every home visit until the dashboard loads.
 */
export default function AgentIntroGate({
  isEmpty,
  demoMode,
  dashboardReady,
  forceVariant,
  contained = false,
  onIntroDismissed,
  onIntroVisibilityChange,
}: {
  isEmpty: boolean;
  demoMode: boolean;
  dashboardReady: boolean;
  forceVariant?: "convergence" | "briefing";
  contained?: boolean;
  onIntroDismissed?: () => void;
  onIntroVisibilityChange?: (visible: boolean) => void;
}) {
  const experiment = useExperiment(AGENT_INTRO_EXPERIMENT_KEY, {
    enabled: !demoMode && !forceVariant,
    forceVariant,
  });

  const [dismissed, setDismissed] = useState(false);
  const [playKey, setPlayKey] = useState(0);

  const dest = isEmpty ? "empty" : "portfolio";
  const variant = forceVariant ?? experiment.variant;
  const treatment = isAgentIntroTreatment(variant);

  const shouldShow = useMemo(() => {
    if (demoMode || dismissed) return false;
    if (!forceVariant && prefersReducedMotionIntro()) return false;

    if (forceVariant) return true;

    if (experiment.loading) return false;
    if (experiment.previewing && treatment) return true;
    if (experiment.status !== "running" || !treatment) return false;
    return true;
  }, [
    demoMode,
    dismissed,
    experiment.loading,
    experiment.previewing,
    experiment.status,
    forceVariant,
    treatment,
  ]);

  useEffect(() => {
    if (shouldShow) {
      resetAgentIntroEngagementSession();
      setPlayKey((k) => k + 1);
    }
  }, [shouldShow, variant]);

  useEffect(() => {
    onIntroVisibilityChange?.(shouldShow);
  }, [onIntroVisibilityChange, shouldShow]);

  const finish = useCallback(
    (outcome: "completed" | "skipped") => {
      markAgentIntroEngagementReady();
      onIntroDismissed?.();
      setDismissed(true);
      void trackExperimentEvent(outcome === "completed" ? "agent_intro_completed" : "agent_intro_skipped", {
        experiment: AGENT_INTRO_EXPERIMENT_KEY,
        variant,
        dest,
      });
    },
    [dest, onIntroDismissed, variant],
  );

  if (!shouldShow) return null;

  if (variant === "briefing") {
    return (
      <AgentIntroBriefing
        key={`briefing-${playKey}`}
        playKey={playKey}
        contained={contained}
        dashboardReady={dashboardReady}
        onComplete={() => finish("completed")}
        onSkip={() => finish("skipped")}
      />
    );
  }

  if (variant === "convergence") {
    return (
      <AgentIntroConvergence
        key={`convergence-${playKey}`}
        playKey={playKey}
        contained={contained}
        dashboardReady={dashboardReady}
        onComplete={() => finish("completed")}
        onSkip={() => finish("skipped")}
      />
    );
  }

  return null;
}
