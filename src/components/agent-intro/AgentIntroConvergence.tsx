"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAgentIntroDismissWhenReady } from "@/hooks/useAgentIntroDismissWhenReady";
import { useIntroBodyScrollLock } from "@/hooks/useIntroBodyScrollLock";
import { useI18n } from "@/lib/i18n";
import styles from "./agent-intro.module.css";
import {
  AgentAvatarImage,
  AgentIntroLoadingBlock,
  AgentIntroLogoBlock,
  AgentIntroOverlayShell,
  type IntroPhase,
} from "./AgentIntroShared";

const PHASE_MS: Record<Exclude<IntroPhase, "idle" | "done" | "reveal">, number> = {
  enter: 800,
  present: 1000,
  merge: 800,
};

function nextPhase(phase: IntroPhase): IntroPhase {
  if (phase === "idle") return "enter";
  if (phase === "enter") return "present";
  if (phase === "present") return "merge";
  if (phase === "merge") return "reveal";
  return "reveal";
}

export default function AgentIntroConvergence({
  playKey = 0,
  contained = false,
  dashboardReady,
  onComplete,
  onSkip,
}: {
  playKey?: number;
  contained?: boolean;
  dashboardReady: boolean;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<IntroPhase>("idle");

  const { fading, dismissed } = useAgentIntroDismissWhenReady({
    playKey,
    dashboardReady,
    animationReady: phase === "reveal",
    onComplete,
  });

  useEffect(() => {
    setPhase("enter");
  }, [playKey]);

  useEffect(() => {
    if (phase !== "enter" && phase !== "present" && phase !== "merge") return;

    const timer = window.setTimeout(() => {
      setPhase((current) => nextPhase(current));
    }, PHASE_MS[phase]);

    return () => window.clearTimeout(timer);
  }, [phase]);

  const overlayVisible = !dismissed;
  const waitingForDashboard = phase === "reveal" && !dashboardReady;
  useIntroBodyScrollLock(!contained && overlayVisible);

  const stageClass = [
    styles.convergenceStage,
    phase === "enter" ? styles.convergencePhaseEnter : "",
    phase === "present" ? styles.convergencePhasePresent : "",
    phase === "merge" || phase === "reveal" ? styles.convergencePhaseMerge : "",
    phase === "reveal" ? styles.convergencePhaseReveal : "",
  ]
    .filter(Boolean)
    .join(" ");

  const panel = (
    <AgentIntroOverlayShell
      contained={contained}
      hidden={fading || dismissed}
      role="dialog"
      aria-modal="true"
      aria-label={t("agentIntroConvergenceAria")}
    >
      <button type="button" className={styles.skipBtn} onClick={onSkip}>
        {t("agentIntroSkip")}
      </button>

      <div className={stageClass}>
        <span
          className={`${styles.agentOrb} ${styles.agentOrbEmerald} ${styles.convergenceOrbWarren}`}
          aria-hidden="true"
        />
        <span
          className={`${styles.agentOrb} ${styles.agentOrbAmber} ${styles.convergenceOrbClara}`}
          aria-hidden="true"
        />

        <div className={styles.convergenceAgents}>
          <div className={`${styles.agentCard} ${styles.convergenceWarren}`}>
            <AgentAvatarImage name="Warren" src="/avatars/warren-512.png" />
            <p className={styles.agentName}>{t("landingAgentsWarrenName")}</p>
            <p className={`${styles.agentRole} ${styles.roleEmerald}`}>{t("landingAgentsWarrenRole")}</p>
            <p className={styles.agentTagline}>{t("agentIntroWarrenTagline")}</p>
          </div>

          <div className={`${styles.agentCard} ${styles.convergenceClara}`}>
            <AgentAvatarImage name="Clara" src="/avatars/clara-512.png" />
            <p className={styles.agentName}>{t("landingAgentsClaraName")}</p>
            <p className={`${styles.agentRole} ${styles.roleAmber}`}>{t("landingAgentsClaraRole")}</p>
            <p className={styles.agentTagline}>{t("agentIntroClaraTagline")}</p>
          </div>
        </div>

        <div className={styles.convergenceCenter}>
          <AgentIntroLogoBlock tagline={t("agentIntroLogoTagline")} />
          <AgentIntroLoadingBlock label={t("agentIntroLoading")} visible={waitingForDashboard} />
        </div>
      </div>
    </AgentIntroOverlayShell>
  );

  if (!overlayVisible) return null;
  if (contained) return panel;
  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
}
