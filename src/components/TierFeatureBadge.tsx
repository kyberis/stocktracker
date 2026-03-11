"use client";

import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { planDisplayName } from "@/lib/subscription";
import TierIcon from "./TierIcon";
import type { SubscriptionPlan } from "@/lib/types";

const PLAN_RANK: Record<SubscriptionPlan, number> = { free: 0, starter: 1, pro: 2 };

interface TierFeatureBadgeProps {
  requiredPlan: "starter" | "pro";
  size?: "xs" | "sm";
  className?: string;
}

export default function TierFeatureBadge({
  requiredPlan,
  size = "xs",
  className = "",
}: TierFeatureBadgeProps) {
  const { user, isLoading } = useAuth();
  const { t } = useI18n();

  if (isLoading || !user) return null;

  const userPlan = user.plan;
  const hasAccess = PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];

  if (hasAccess) {
    const iconSize = size === "xs" ? 12 : 14;
    const tierName = planDisplayName(userPlan);
    const label = t("includedInPlan").replace("{plan}", tierName);

    return (
      <span
        className={`inline-flex items-center opacity-40 hover:opacity-75 transition-opacity cursor-default ${
          userPlan === "pro"
            ? "text-emerald-500 dark:text-emerald-400"
            : "text-blue-500 dark:text-blue-400"
        } ${className}`}
        aria-label={label}
        title={label}
      >
        <TierIcon plan={userPlan} size={iconSize} />
      </span>
    );
  }

  const tierName = planDisplayName(requiredPlan);
  const pillSize =
    size === "xs"
      ? "text-[9px] px-1.5 py-0.5"
      : "text-[10px] px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-400 ${pillSize} ${className}`}
    >
      {tierName}
    </span>
  );
}
