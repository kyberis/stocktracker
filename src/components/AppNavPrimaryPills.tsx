"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import TierFeatureBadge from "./TierFeatureBadge";
import type { AppNavPrimaryItem } from "@/lib/app-nav";

export type AppNavPrimaryPillsVariant = "default" | "studio" | "scroll";

/**
 * Primary desktop nav destinations as pills. Data should come from `getDesktopNavItems(flags)` —
 * the same catalog as the sidebar (not only bottom-tab items).
 */
export default function AppNavPrimaryPills({
  items,
  pathname,
  variant = "default",
  className,
  navAriaLabel,
}: {
  items: AppNavPrimaryItem[];
  pathname: string;
  variant?: AppNavPrimaryPillsVariant;
  className?: string;
  navAriaLabel: string;
}) {
  const { t } = useI18n();

  if (items.length === 0) return null;

  /** Single-row horizontal scroll: keeps header height predictable (no wrap). */
  const scrollNavClass =
    "w-full overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory";

  const navClass =
    variant === "scroll"
      ? `${scrollNavClass} pb-0.5 pt-0.5 scroll-pl-4 scroll-pr-4 -mx-4 px-4`
      : variant === "default"
        ? `${scrollNavClass} py-0`
        : "";

  const ulClass =
    variant === "scroll"
      ? "flex w-max min-w-full flex-nowrap items-stretch justify-start gap-2"
      : variant === "default"
        ? "flex w-max min-w-0 max-w-full flex-nowrap items-center justify-start gap-1.5"
        : variant === "studio"
          ? "flex w-full flex-wrap items-center justify-center gap-1"
          : "flex w-full flex-wrap items-center justify-center gap-1.5";

  const pillClass = (active: boolean) => {
    if (variant === "studio") {
      return active
        ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : "border border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:text-zinc-200";
    }
    return active
      ? "border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : "border border-gray-200/90 dark:border-slate-600/80 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800/80";
  };

  const sizeClass =
    variant === "studio"
      ? "px-2.5 py-1 text-xs font-medium leading-tight"
      : variant === "scroll"
        ? "min-h-[44px] shrink-0 snap-start px-3 py-2 text-sm font-medium"
        : "min-h-[32px] shrink-0 snap-start px-2.5 py-1 text-xs font-medium leading-tight";

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900";

  return (
    <nav className={`${navClass} ${className ?? ""}`.trim()} aria-label={navAriaLabel}>
      <ul className={`m-0 list-none p-0 ${ulClass}`}>
        {items.map((link) => {
          const active = link.matches(pathname);
          return (
            <li
              key={link.href}
              className={variant === "scroll" || variant === "default" ? "shrink-0 snap-start" : ""}
            >
              <Link
                href={link.href}
                className={`inline-flex items-center gap-1 whitespace-nowrap transition-colors rounded-full ${pillClass(active)} ${sizeClass} ${focusRing}`}
              >
                {t(link.labelKey)}
                {link.tierBadge ? <TierFeatureBadge requiredPlan={link.tierBadge} size="xs" className="ml-0.5" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
