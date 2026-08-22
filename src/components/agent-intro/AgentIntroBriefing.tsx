"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n";
import styles from "./agent-intro.module.css";
import {
  AgentAvatarImage,
  AgentIntroLogoBlock,
  overlayShellClass,
} from "./AgentIntroShared";

type BriefPhase = "idle" | "chat" | "bridge" | "merge" | "reveal" | "done";

const PHASE_MS: Record<Exclude<BriefPhase, "idle" | "done">, number> = {
  chat: 1200,
  bridge: 1200,
  merge: 800,
  reveal: 800,
};

function nextPhase(phase: BriefPhase): BriefPhase {
  if (phase === "idle") return "chat";
  if (phase === "chat") return "bridge";
  if (phase === "bridge") return "merge";
  if (phase === "merge") return "reveal";
  if (phase === "reveal") return "done";
  return "done";
}

export default function AgentIntroBriefing({
  playKey = 0,
  contained = false,
  onComplete,
  onSkip,
}: {
  playKey?: number;
  contained?: boolean;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<BriefPhase>("idle");
  const [mounted, setMounted] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    finishedRef.current = false;
    setPhase("chat");
  }, [playKey]);

  useEffect(() => {
    if (phase === "idle") return;
    if (phase === "done") {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onComplete();
      }
      return;
    }
    const timer = window.setTimeout(() => {
      setPhase((current) => nextPhase(current));
    }, PHASE_MS[phase]);
    return () => window.clearTimeout(timer);
  }, [phase, onComplete]);

  const overlayVisible = phase !== "done";

  const stageClass = [
    styles.briefingStage,
    phase !== "idle" ? styles.briefingPhaseChat : "",
    phase === "bridge" || phase === "merge" || phase === "reveal" || phase === "done"
      ? styles.briefingPhaseBridge
      : "",
    phase === "merge" || phase === "reveal" || phase === "done" ? styles.briefingPhaseMerge : "",
    phase === "reveal" || phase === "done" ? styles.briefingPhaseReveal : "",
  ]
    .filter(Boolean)
    .join(" ");

  const overlayClass = overlayShellClass(
    contained,
    !overlayVisible,
  ).concat(phase === "reveal" || phase === "done" ? ` ${styles.briefingOverlayReveal}` : "");

  const panel = (
    <div className={overlayClass} role="dialog" aria-modal="true" aria-label={t("agentIntroBriefingAria")}>
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
    </div>
  );

  if (!mounted || !overlayVisible) return null;
  if (contained) return panel;
  return createPortal(panel, document.body);
}
