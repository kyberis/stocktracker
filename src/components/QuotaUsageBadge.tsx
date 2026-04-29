"use client";

import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { FEATURE_QUOTAS, type FeatureQuotaKey } from "@/lib/platform-config";
import Link from "next/link";

interface QuotaUsageBadgeProps {
  feature: FeatureQuotaKey;
  size?: "xs" | "sm";
  className?: string;
  /** Show "Upgrade" link when remaining is 0. Default true. */
  showUpgrade?: boolean;
}

/**
 * Displays a per-feature quota usage badge ("12 / 20 this month").
 * Pulls quota state from the authenticated user when available; falls back to
 * the static plan limit when usage hasn't been fetched yet (e.g. SSR).
 */
export default function QuotaUsageBadge({
  feature,
  size = "xs",
  className = "",
  showUpgrade = true,
}: QuotaUsageBadgeProps) {
  const { user } = useAuth();
  const { t } = useI18n();

  const config = FEATURE_QUOTAS[feature];
  if (!config) return null;

  const plan = (user?.plan as "free" | "pro" | undefined) ?? "free";
  const fallbackLimit = plan === "pro" ? config.pro : config.free;
  const usage = user?.quotas?.[feature];
  const used = usage?.used ?? 0;
  const limit = usage?.limit ?? fallbackLimit;
  const remaining = Math.max(0, limit - used);
  const exhausted = remaining === 0 && limit > 0;
  const lowFraction = limit > 0 ? remaining / limit : 1;
  const isLow = !exhausted && lowFraction < 0.2;

  const text = `${used.toLocaleString()} / ${limit.toLocaleString()}`;
  const sizeCls = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5";

  const tone = exhausted
    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
    : isLow
      ? "bg-amber-400/15 text-amber-700 dark:text-amber-400 border border-amber-400/30"
      : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold tabular-nums ${sizeCls} ${tone} ${className}`}
      aria-label={t("quotaUsageAria")
        .replace("{used}", String(used))
        .replace("{limit}", String(limit))
        .replace("{feature}", config.label)}
      title={config.label}
    >
      <span>{text}</span>
      {exhausted && showUpgrade && (
        <Link
          href="/billing"
          className="text-[10px] font-bold uppercase tracking-wide hover:underline"
        >
          {t("quotaUsageUpgrade")}
        </Link>
      )}
    </span>
  );
}
