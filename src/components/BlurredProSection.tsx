"use client";

import type { ReactNode } from "react";

/**
 * Subscription model v2: every feature is universal. The previous
 * `BlurredProSection` blurred premium content behind an "Upgrade to Trefolio"
 * CTA; under the quota model that gating no longer applies. This component is
 * kept as a transparent pass-through so existing call sites keep compiling
 * without churn — when a user runs out of quota the API-level 429 surfaces
 * the upgrade prompt instead.
 */
interface Props {
  children: ReactNode;
  /** @deprecated No longer rendered — kept for backward-compatible call sites. */
  blurb?: string;
  /** @deprecated No longer rendered — kept for backward-compatible call sites. */
  ctaLabel?: string;
}

export default function BlurredProSection({ children }: Props) {
  return <>{children}</>;
}
