"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useCommerceEnabled } from "@/lib/commerce";
import { planDisplayName, planOf } from "@/lib/plan-rank";
import { resolveNavPlanChipKind, type NavPlanChipVariant } from "@/lib/nav-plan-chip";
import TierIcon from "@/components/TierIcon";

/**
 * Plan affordance next to the account name:
 * - Free (sidebar) → upgrade CTA ("View plans") → /billing
 * - Paid (Basic/Pro) → plan badge → /billing
 * - Wealth → plan badge only
 * Free top-nav CTA is on Home (`home-free-upgrade-cta`).
 */
export default function NavPlanChip({ variant = "nav" }: { variant?: NavPlanChipVariant }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const commerceEnabled = useCommerceEnabled();

  if (!user) return null;

  const plan = planOf(user);
  const kind = resolveNavPlanChipKind(plan, commerceEnabled, variant);
  const isNav = variant === "nav";

  if (kind === "hidden") return null;

  if (kind === "free_label") {
    return (
      <span data-testid="nav-plan-badge" data-plan="free" className="text-xs text-[color:var(--muted)]">
        {t("freeBadge")}
      </span>
    );
  }

  if (kind === "upgrade_cta") {
    return (
      <Link
        href="/billing"
        data-testid="nav-plan-upgrade-cta"
        className="text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400"
      >
        {t("upgradeToPro")}
      </Link>
    );
  }

  const label = planDisplayName(plan);
  const badgeClass = isNav
    ? "inline-flex min-h-9 max-w-[7.5rem] items-center gap-1 truncate rounded-full border border-emerald-500/25 bg-emerald-500/12 px-2 text-[10px] font-bold text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400"
    : "inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--muted)] transition-colors hover:text-emerald-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:text-emerald-400";

  const inner = (
    <>
      <TierIcon plan={plan} size={12} />
      <span className="truncate">{label}</span>
    </>
  );

  if (kind === "plan_static") {
    return (
      <span
        data-testid="nav-plan-badge"
        data-plan={plan}
        className={
          isNav
            ? badgeClass
            : "inline-flex items-center gap-1 text-xs text-[color:var(--muted)]"
        }
        title={label}
      >
        {inner}
      </span>
    );
  }

  return (
    <Link
      href="/billing"
      data-testid="nav-plan-badge"
      data-plan={plan}
      title={`${label} — ${t("upgradeToPro")}`}
      aria-label={`${label}. ${t("upgradeToPro")}`}
      className={`${badgeClass} hover:bg-emerald-500/20`}
    >
      {inner}
    </Link>
  );
}
