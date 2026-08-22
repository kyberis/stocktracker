"use client";

import Image from "next/image";
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
} from "./AgentIntroShared";

type BriefPhase = "idle" | "chat" | "bridge" | "merge" | "reveal";

const PHASE_MS: Record<Exclude<BriefPhase, "idle" | "reveal">, number> = {
  chat: 1200,
  bridge: 1200,
  merge: 800,
};

function nextPhase(phase: BriefPhase): BriefPhase {
  if (phase === "idle") return "chat";
  if (phase === "chat") return "bridge";
  if (phase === "bridge") return "merge";
  if (phase === "merge") return "reveal";
  return "reveal";
}

export default function AgentIntroBriefing({
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
  const [phase, setPhase] = useState<BriefPhase>("idle");
  const [mounted, setMounted] = useState(false);

  const { fading, dismissed } = useAgentIntroDismissWhenReady({
    playKey,
    dashboardReady,
    animationReady: phase === "reveal",
    onComplete,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPhase("chat");
  }, [playKey]);

  useEffect(() => {
    if (phase === "idle" || phase === "reveal") return;

    const timer = window.setTimeout(() => {
      setPhase((current) => nextPhase(current));
    }, PHASE_MS[phase]);

    return () => window.clearTimeout(timer);
  }, [phase]);

  const overlayVisible = !dismissed;
  const waitingForDashboard = phase === "reveal" && !dashboardReady;
  useIntroBodyScrollLock(!contained && overlayVisible);

  const stageClass = [
    styles.briefingStage,
    phase !== "idle" ? styles.briefingPhaseChat : "",
    phase === "bridge" || phase === "merge" || phase === "reveal"
      ? styles.briefingPhaseBridge
      : "",
    phase === "merge" || phase === "reveal" ? styles.briefingPhaseMerge : "",
    phase === "reveal" ? styles.briefingPhaseReveal : "",
  ]
    .filter(Boolean)
    .join(" ");

  const panel = (
    <AgentIntroOverlayShell
      contained={contained}
      hidden={fading || dismissed}
      className={phase === "reveal" ? styles.briefingOverlayReveal : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={t("agentIntroBriefingAria")}
    >
      <button type="button" className={styles.skipBtn} onClick={onSkip}>
        {t("agentIntroSkip")}
      </button>

      <div className={stageClass}>
        <div className={styles.briefingCard}>
          <div className={styles.briefingRow}>
            <AgentAvatarImage name="Warren" src="/avatars/warren-512.png" />
            <div className={`${styles.bubble} ${styles.bubbleWarren}`}>{t("agentIntroBriefingWarren")}</div>
          </div>
          <div className={styles.briefingRow}>
            <AgentAvatarImage name="Clara" src="/avatars/clara-512.png" />
            <div className={`${styles.bubble} ${styles.bubbleClara}`}>{t("agentIntroBriefingClara")}</div>
          </div>
          <div className={styles.briefingBridge} aria-hidden="true" />
          <p className={styles.briefingSubtitle}>{t("agentIntroBriefingSubtitle")}</p>
        </div>

        <div className={styles.briefingLogoWrap}>
          <AgentIntroLogoBlock tagline={t("agentIntroBriefingLogoTagline")} />
          <AgentIntroLoadingBlock label={t("agentIntroLoading")} visible={waitingForDashboard} />
        </div>
      </div>

      <div className={styles.briefingChips}>
        <span className={styles.miniChip}>
          <span className={styles.miniChipAvatar}>
            <Image
              src="/avatars/warren-512.png"
              alt=""
              width={20}
              height={20}
              className="h-full w-full object-cover"
            />
          </span>
          {t("landingAgentsWarrenName")}
        </span>
        <span className={styles.miniChip}>
          <span className={styles.miniChipAvatar}>
            <Image
              src="/avatars/clara-512.png"
              alt=""
              width={20}
              height={20}
              className="h-full w-full object-cover"
            />
          </span>
          {t("landingAgentsClaraName")}
        </span>
      </div>
    </AgentIntroOverlayShell>
  );

  if (!mounted || !overlayVisible) return null;
  if (contained) return panel;
  return createPortal(panel, document.body);
}
