"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AGENT_INTRO_EXPERIMENT_KEY,
  hasAgentIntroShownToday,
  isAgentIntroTreatment,
  markAgentIntroEngagementReady,
  markAgentIntroShownToday,
  prefersReducedMotionIntro,
  resetAgentIntroEngagementSession,
  shouldBlockAgentIntro,
  shouldPlayAgentIntroAnimation,
} from "@/lib/agent-intro";
import { trackExperimentEvent, useExperiment } from "@/lib/use-experiment";
import AgentIntroSplashShell from "./AgentIntroSplashShell";

const AgentIntroConvergence = dynamic(() => import("./AgentIntroConvergence"), {
  ssr: false,
  loading: () => <AgentIntroSplashShell />,
});
const AgentIntroBriefing = dynamic(() => import("./AgentIntroBriefing"), {
  ssr: false,
  loading: () => <AgentIntroSplashShell />,
});

/**
 * A/B gate for Warren + Clara home intro (`agent_intro` experiment).
 * Control: no overlay. Treatments: full-screen intro once per local calendar day.
 * Admin `forceVariant` always plays. Navigating around the app does not replay it.
 */
export default function AgentIntroGate({
  isEmpty,
  demoMode,
  dashboardReady,
  forceVariant,
  contained = false,
  alreadyShownToday = false,
  onIntroDismissed,
  onIntroVisibilityChange,
}: {
  isEmpty: boolean;
  demoMode: boolean;
  dashboardReady: boolean;
  forceVariant?: "convergence" | "briefing";
  contained?: boolean;
  alreadyShownToday?: boolean;
  onIntroDismissed?: () => void;
  onIntroVisibilityChange?: (visible: boolean) => void;
}) {
  const experiment = useExperiment(AGENT_INTRO_EXPERIMENT_KEY, {
    enabled: !demoMode && !forceVariant,
    forceVariant,
  });

  const skipToday = Boolean(!forceVariant && alreadyShownToday);
  const [dismissed, setDismissed] = useState(skipToday);
  const [playKey, setPlayKey] = useState(0);
  const playingThisVisitRef = useRef(false);

  const dest = isEmpty ? "empty" : "portfolio";
  const variant = forceVariant ?? experiment.variant;
  const treatment = isAgentIntroTreatment(variant);
  const reducedMotion = !forceVariant && prefersReducedMotionIntro();
  const gateInput = {
    demoMode,
    dismissed,
    forceVariant,
    reducedMotion,
    experimentLoading: experiment.loading,
    experimentPreviewing: experiment.previewing,
    experimentStatus: experiment.status,
    treatment,
    alreadyShownToday: skipToday,
  };

  const blocksDashboard = shouldBlockAgentIntro(gateInput);
  const showAnimation = shouldPlayAgentIntroAnimation(gateInput);

  useLayoutEffect(() => {
    if (forceVariant || demoMode) return;
    if (playingThisVisitRef.current) return;
    if (alreadyShownToday || hasAgentIntroShownToday()) {
      markAgentIntroEngagementReady();
      onIntroDismissed?.();
      setDismissed(true);
      return;
    }
    if (blocksDashboard) {
      playingThisVisitRef.current = true;
      markAgentIntroShownToday();
    }
  }, [alreadyShownToday, blocksDashboard, demoMode, forceVariant, onIntroDismissed]);

  useEffect(() => {
    if (showAnimation) {
      resetAgentIntroEngagementSession();
      setPlayKey((k) => k + 1);
    }
  }, [showAnimation, variant]);

  useLayoutEffect(() => {
    onIntroVisibilityChange?.(blocksDashboard);
  }, [blocksDashboard, onIntroVisibilityChange]);

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

  if (!blocksDashboard) return null;

  if (!showAnimation) {
    return <AgentIntroSplashShell contained={contained} />;
  }

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

  return <AgentIntroSplashShell contained={contained} />;
}
