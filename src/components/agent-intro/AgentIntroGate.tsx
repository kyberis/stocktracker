"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AGENT_INTRO_EXPERIMENT_KEY,
  hasAgentIntroShownThisSession,
  isAgentIntroTreatment,
  markAgentIntroEngagementReady,
  markAgentIntroShownThisSession,
  prefersReducedMotionIntro,
} from "@/lib/agent-intro";
import { trackExperimentEvent, useExperiment } from "@/lib/use-experiment";

const AgentIntroConvergence = dynamic(() => import("./AgentIntroConvergence"), { ssr: false });
const AgentIntroBriefing = dynamic(() => import("./AgentIntroBriefing"), { ssr: false });

/**
 * A/B gate for Warren + Clara home intro (`agent_intro` experiment).
 * Control: no overlay. Treatments: once per session on `/`.
 */
export default function AgentIntroGate({
  isEmpty,
  demoMode,
  isReady,
  forceVariant,
  contained = false,
  onIntroDismissed,
}: {
  isEmpty: boolean;
  demoMode: boolean;
  isReady: boolean;
  forceVariant?: "convergence" | "briefing";
  contained?: boolean;
  onIntroDismissed?: () => void;
}) {
  const experiment = useExperiment(AGENT_INTRO_EXPERIMENT_KEY, {
    enabled: !demoMode && isReady && !forceVariant,
    forceVariant,
  });

  const [sessionShown, setSessionShown] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    if (forceVariant) {
      setSessionShown(false);
      return;
    }
    setSessionShown(hasAgentIntroShownThisSession());
  }, [forceVariant]);

  const dest = isEmpty ? "empty" : "portfolio";
  const variant = forceVariant ?? experiment.variant;
  const treatment = isAgentIntroTreatment(variant);

  const shouldShow = useMemo(() => {
    if (demoMode || !isReady || dismissed) return false;
    if (!forceVariant && sessionShown) return false;
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
    isReady,
    sessionShown,
    treatment,
  ]);

  const finish = useCallback(
    (outcome: "completed" | "skipped") => {
      if (!forceVariant) {
        markAgentIntroShownThisSession();
        setSessionShown(true);
      }
      markAgentIntroEngagementReady();
      onIntroDismissed?.();
      setDismissed(true);
      void trackExperimentEvent(outcome === "completed" ? "agent_intro_completed" : "agent_intro_skipped", {
        experiment: AGENT_INTRO_EXPERIMENT_KEY,
        variant,
        dest,
      });
    },
    [dest, forceVariant, onIntroDismissed, variant],
  );

  useEffect(() => {
    if (shouldShow) setPlayKey((k) => k + 1);
  }, [shouldShow, variant]);

  if (!shouldShow) return null;

  if (variant === "briefing") {
    return (
      <AgentIntroBriefing
        key={`briefing-${playKey}`}
        playKey={playKey}
        contained={contained}
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
        onComplete={() => finish("completed")}
        onSkip={() => finish("skipped")}
      />
    );
  }

  return null;
}
