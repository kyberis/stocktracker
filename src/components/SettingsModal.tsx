"use client";

import { useState } from "react";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { RefreshInterval } from "@/lib/types";
import ProCompareCard from "@/components/ProCompareCard";
import TierIcon from "@/components/TierIcon";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { refreshInterval, setRefreshInterval } = useSettings();
  const { t } = useI18n();
  const { user } = useAuth();

  const [localRefreshInterval, setLocalRefreshInterval] = useState<RefreshInterval>(refreshInterval);

  const handleSave = () => {
    setRefreshInterval(localRefreshInterval);
    onClose();
  };

  const focusTrapRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={focusTrapRef} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        <h2 id="settings-modal-title" className="text-xl font-bold text-gray-900 dark:text-white mb-5">{t("settings")}</h2>

        <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 dark:border-slate-600 p-3 bg-gray-50 dark:bg-slate-800/40">
            <p className="text-sm text-gray-700 dark:text-slate-200">
              {t("currentPlan")}:{" "}
              <span className="inline-flex items-center gap-1 font-semibold"><TierIcon plan={(user?.plan as "free" | "starter" | "pro") || "free"} size={14} />{user?.plan === "pro" ? t("planPro") : user?.plan === "starter" ? t("planStarter") : t("planFree")}</span>
            </p>
          </div>
          {user?.plan !== "pro" && (
            <ProCompareCard
              surface="settings_always_on"
              reason="upgrade_required"
              compact
              aiUsage={{ used: user?.aiCallsThisMonth ?? 0, limit: 5 }}
            />
          )}
        </div>

        <div className="mt-5">
          <label className="block text-sm text-gray-500 dark:text-slate-400 mb-2">{t("refreshInterval")}</label>
          <div className="grid grid-cols-3 gap-2">
            {([15, 30, 60] as const).map((val) => (
              <button
                key={val}
                onClick={() => setLocalRefreshInterval(val)}
                className={`px-4 py-2.5 rounded-xl border-2 transition-all text-center ${
                  localRefreshInterval === val
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                    : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500"
                }`}
              >
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {val === 15 ? t("refreshEvery15") : val === 30 ? t("refreshEvery30") : t("refreshEvery60")}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <a
            href="/profile"
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
            onClick={onClose}
          >
            {user?.plan === "pro" ? t("manageSubscription") : user?.plan === "starter" ? t("upgradeToPro") : t("upgradeToStarter")} →
          </a>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">
              {t("cancel")}
            </button>
            <button onClick={handleSave} className="btn-primary">
              {t("saveSettings")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
