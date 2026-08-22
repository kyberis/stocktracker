"use client";

import type { HTMLAttributes, ReactNode } from "react";
import Image from "next/image";
import { useId } from "react";
import styles from "./agent-intro.module.css";

export type IntroPhase = "idle" | "enter" | "present" | "merge" | "reveal" | "done";

export function TrefolioLogoMark({ size = 72 }: { size?: number }) {
  const gid = useId().replace(/:/g, "");
  const ga = `intro-a-${gid}`;
  const gb = `intro-b-${gid}`;
  const gc = `intro-c-${gid}`;
  const gd = `intro-d-${gid}`;

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="rounded-2xl">
      <defs>
        <linearGradient id={ga} x1=".5" y1="0" x2=".5" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id={gb} x1="0" y1=".3" x2="1" y2=".7">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id={gc} x1=".5" y1="1" x2=".5" y2="0">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id={gd} x1="1" y1=".3" x2="0" y2=".7">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="#0f172a" />
      <g transform="translate(16,16) rotate(45)">
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill={`url(#${ga})`} />
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill={`url(#${gb})`} transform="rotate(90)" />
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill={`url(#${gc})`} transform="rotate(180)" />
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill={`url(#${gd})`} transform="rotate(270)" />
        <circle cx="0" cy="0" r="1.2" fill="#0f172a" opacity=".35" />
      </g>
    </svg>
  );
}

export function AgentAvatarImage({ name, src }: { name: "Warren" | "Clara"; src: string }) {
  return (
    <div className={styles.agentAvatarWrap}>
      <Image src={src} alt="" width={88} height={88} className="h-full w-full object-cover" />
      <span className="sr-only">{name}</span>
    </div>
  );
}

export function AgentIntroLogoBlock({ tagline }: { tagline: string }) {
  return (
    <div className={styles.logoBlock}>
      <TrefolioLogoMark size={80} />
      <p className={styles.logoWordmark}>trefolio</p>
      <p className={styles.logoTagline}>{tagline}</p>
    </div>
  );
}

export function AgentIntroLoadingBlock({ label, visible }: { label: string; visible: boolean }) {
  return (
    <div
      className={[styles.loadingBlock, visible ? styles.loadingBlockVisible : ""].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
      aria-busy={visible}
    >
      <div className={styles.loadingSpinner} aria-hidden="true" />
      <p className={styles.loadingLabel}>{label}</p>
    </div>
  );
}

export function AgentIntroOverlayShell({
  contained,
  hidden,
  children,
  className,
  ...props
}: {
  contained: boolean;
  hidden: boolean;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  const innerClass = [styles.overlay, hidden ? styles.overlayHidden : "", className]
    .filter(Boolean)
    .join(" ");

  if (contained) {
    return (
      <div className={[styles.containedOverlay, hidden ? styles.overlayHidden : ""].filter(Boolean).join(" ")}>
        <div className={innerClass} {...props}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={[styles.productionOverlay, hidden ? styles.overlayHidden : ""].filter(Boolean).join(" ")}>
      <div className={innerClass} {...props}>
        {children}
      </div>
    </div>
  );
}

/** @deprecated Use AgentIntroOverlayShell — single-class shell breaks fullscreen (absolute overrides fixed). */
export function overlayShellClass(contained: boolean, hidden: boolean): string {
  return [
    contained ? styles.containedOverlay : styles.productionOverlay,
    styles.overlay,
    hidden ? styles.overlayHidden : "",
  ]
    .filter(Boolean)
    .join(" ");
}
