"use client";

import { createPortal } from "react-dom";
import { useIntroBodyScrollLock } from "@/hooks/useIntroBodyScrollLock";
import { useI18n } from "@/lib/i18n";
import styles from "./agent-intro.module.css";
import { AgentIntroLogoBlock, AgentIntroOverlayShell } from "./AgentIntroShared";

/** Instant full-screen branded shell — shown before the experiment resolves or the animation chunk loads. */
export default function AgentIntroSplashShell({ contained = false }: { contained?: boolean }) {
  const { t } = useI18n();
  useIntroBodyScrollLock(!contained);

  const panel = (
    <AgentIntroOverlayShell contained={contained} hidden={false} aria-hidden={true}>
      <div className={styles.splashShell}>
        <AgentIntroLogoBlock tagline={t("agentIntroBriefingLogoTagline")} />
      </div>
    </AgentIntroOverlayShell>
  );

  if (contained) return panel;
  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
}
