"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useIsNative } from "@/lib/use-native";
import { useFeatureFlags } from "@/lib/feature-flag-context";
import {
  MOBILE_MORE_EXTRA,
  MOBILE_TAB_ICON_PATH,
  NATIVE_MOBILE_TABS,
  getMobileWebMoreItems,
  getMobileWebTabItems,
} from "@/lib/app-nav";
import TierFeatureBadge from "./TierFeatureBadge";

function MobileNavMoreSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const flags = useFeatureFlags();
  const titleId = useId();

  const primaryMore = useMemo(() => getMobileWebMoreItems(flags), [flags]);
  const extras = MOBILE_MORE_EXTRA;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] sm:hidden" role="presentation">
      <button
        type="button"
        aria-label={t("close")}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="glass-overlay absolute bottom-0 left-0 right-0 max-h-[min(70vh,420px)] overflow-y-auto rounded-t-[28px] border border-[color:var(--border)] shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 pb-2 pt-3">
          <h2 id={titleId} className="text-sm font-semibold text-[color:var(--foreground)]">
            {t("moreNav")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-2xl border border-transparent p-2 text-[color:var(--muted)] hover:border-[color:var(--border)] hover:bg-white/10"
            aria-label={t("close")}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="p-2" aria-label={t("moreNav")}>
          <ul className="space-y-0.5">
            {primaryMore.map((item) => {
              const active = item.matches(pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "border-emerald-500/25 bg-emerald-500/12 text-[color:var(--foreground)]"
                        : "border-transparent text-[color:var(--foreground)] hover:border-[color:var(--border)] hover:bg-white/10"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="flex-1">{t(item.labelKey)}</span>
                    {item.tierBadge ? (
                      <TierFeatureBadge requiredPlan={item.tierBadge} size="xs" className="shrink-0" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
            {extras.map((item) => {
              const active = item.matches(pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "border-emerald-500/25 bg-emerald-500/12 text-[color:var(--foreground)]"
                        : "border-transparent text-[color:var(--foreground)] hover:border-[color:var(--border)] hover:bg-white/10"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const isNative = useIsNative();
  const flags = useFeatureFlags();
  const [moreOpen, setMoreOpen] = useState(false);

  const webTabs = useMemo(() => getMobileWebTabItems(flags), [flags]);
  const morePrimary = useMemo(() => getMobileWebMoreItems(flags), [flags]);

  const moreActive = useMemo(() => {
    const primaryHit = morePrimary.some((item) => item.matches(pathname));
    const extraHit = MOBILE_MORE_EXTRA.some((item) => item.matches(pathname));
    return primaryHit || extraHit;
  }, [morePrimary, pathname]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (isNative) {
    return (
      <nav className="glass-overlay fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--border)] pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="flex items-stretch">
          {NATIVE_MOBILE_TABS.map((tab) => {
            const active = tab.match(pathname);
            const iconPath = MOBILE_TAB_ICON_PATH[tab.href];
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex min-h-14 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-emerald-600 dark:text-emerald-400" : "text-[color:var(--muted)]"
                }`}
              >
                {iconPath ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                  </svg>
                ) : null}
                {t(tab.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="glass-overlay fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--border)] pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="flex items-stretch">
          {webTabs.map((tab) => {
            const active = tab.matches(pathname);
            const iconPath = MOBILE_TAB_ICON_PATH[tab.href];
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex min-h-14 min-w-0 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-emerald-600 dark:text-emerald-400" : "text-[color:var(--muted)]"
                }`}
              >
                {iconPath ? (
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                  </svg>
                ) : null}
                <span className="truncate px-0.5 text-center leading-tight">{t(tab.labelKey)}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={`flex-1 flex min-h-14 min-w-0 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              moreActive ? "text-emerald-600 dark:text-emerald-400" : "text-[color:var(--muted)]"
            }`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={moreActive ? 2.5 : 2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d={MOBILE_TAB_ICON_PATH.more} />
            </svg>
            <span className="truncate px-0.5 text-center leading-tight">{t("moreNav")}</span>
          </button>
        </div>
      </nav>
      <MobileNavMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
