"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import TierIcon from "@/components/TierIcon";
import ThemeSelector from "@/components/ThemeSelector";
import { useCommerceEnabled } from "@/lib/commerce";
import { SUPPORTED_PORTFOLIO_CURRENCIES } from "@/lib/db/helpers";
import type { SubscriptionPlan } from "@/lib/types";
import { planDisplayName, planOf } from "@/lib/plan-rank";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetPortfolio?: () => void;
}

export default function SettingsModal({ isOpen, onClose, onResetPortfolio }: SettingsModalProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { defaultCurrency, setDefaultCurrency } = useSettings();
  const commerceEnabled = useCommerceEnabled();
  const track = useTrack();
  const openedRef = useRef(false);

  useEffect(() => {
    if (isOpen && !openedRef.current) {
      openedRef.current = true;
      track("settings_opened");
    }
    if (!isOpen) openedRef.current = false;
  }, [isOpen, track]);

  const plan: SubscriptionPlan = user?.plan ?? "free";

  const focusTrapRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={focusTrapRef} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 id="settings-modal-title" className="text-xl font-bold text-gray-900 dark:text-white mb-5">{t("settings")}</h2>

        {/* Plan badge + upgrade nudge — only while commerce / paid tiers are live */}
        {commerceEnabled && (
          <div className="rounded-xl border border-gray-200 dark:border-slate-600 p-3 bg-gray-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-700 dark:text-slate-200">
              {t("currentPlan")}:{" "}
              <span className="inline-flex items-center gap-1 font-semibold">
                <TierIcon plan={plan} size={14} />
                {planDisplayName(planOf(user))}
              </span>
            </p>
            {plan !== "wealth" && (
              <Link
                href="/billing"
                onClick={onClose}
                className="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {t("upgradeToPro")} →
              </Link>
            )}
          </div>
        )}

        {/* Theme selector */}
        <div className={commerceEnabled ? "mt-5" : undefined}>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">{t("settingsQuickPreferences")}</p>
          <label className="block text-sm text-gray-500 dark:text-slate-400 mb-2">{t("dashboardTheme")}</label>
          <ThemeSelector />
        </div>

        {/* Default currency */}
        <div className="mt-5">
          <label htmlFor="default-currency-select" className="block text-sm text-gray-500 dark:text-slate-400 mb-2">{t("defaultCurrency")}</label>
          <select
            id="default-currency-select"
            value={defaultCurrency}
            onChange={(e) => {
              track("settings_changed");
              setDefaultCurrency(e.target.value);
            }}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {SUPPORTED_PORTFOLIO_CURRENCIES.map((cur) => (
              <option key={cur} value={cur}>{cur}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t("defaultCurrencyHint")}</p>
        </div>

        <div className="mt-5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/40 p-3">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">{t("settingsAccountLinkHint")}</p>
          <Link href="/profile" onClick={onClose} className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
            {t("settingsOpenFullProfile")}
          </Link>
        </div>

        {onResetPortfolio && (
          <div className="mt-5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 mb-1">
              {t("resetPortfolioDangerZone")}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">{t("resetPortfolioDangerHint")}</p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onResetPortfolio();
              }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-300 hover:bg-red-100/80 dark:hover:bg-red-500/10 transition-colors"
            >
              {t("resetPortfolio")}
            </button>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end mt-6 gap-3">
          <button onClick={onClose} className="btn-secondary">
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
