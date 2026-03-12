"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import TierIcon from "@/components/TierIcon";
import ThemeSelector from "@/components/ThemeSelector";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useI18n();
  const { user } = useAuth();

  const plan = (user?.plan ?? "free") as "free" | "starter" | "pro";
  const isPro = plan === "pro";

  const focusTrapRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={focusTrapRef} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 id="settings-modal-title" className="text-xl font-bold text-gray-900 dark:text-white mb-5">{t("settings")}</h2>

        {/* Plan badge + compact upgrade nudge */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-600 p-3 bg-gray-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-700 dark:text-slate-200">
            {t("currentPlan")}:{" "}
            <span className="inline-flex items-center gap-1 font-semibold">
              <TierIcon plan={plan} size={14} />
              {isPro ? t("planPro") : plan === "starter" ? t("planStarter") : t("planFree")}
            </span>
          </p>
          {!isPro && (
            <Link
              href="/profile"
              onClick={onClose}
              className="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {plan === "starter" ? t("upgradeToPro") : t("upgradeToStarter")} →
            </Link>
          )}
        </div>

        {/* Theme selector */}
        <div className="mt-5">
          <label className="block text-sm text-gray-500 dark:text-slate-400 mb-2">{t("dashboardTheme")}</label>
          <ThemeSelector />
        </div>

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
