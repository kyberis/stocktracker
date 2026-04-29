"use client";

/**
 * Deprecated: with the universal-access quota model (subscription-model-v2)
 * features are no longer plan-gated. This component is kept as a no-op so that
 * existing call sites compile without changes; new code should use
 * `QuotaUsageBadge` to surface per-feature usage instead.
 */
export default function TierFeatureBadge(_props: {
  requiredPlan?: "pro";
  size?: "xs" | "sm";
  className?: string;
}): null {
  void _props;
  return null;
}
