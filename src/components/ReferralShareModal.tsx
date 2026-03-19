"use client";

import { useState, useEffect, useCallback } from "react";
import { Gift, Copy, Check, Share2, X, Crown, BarChart3, Bot, Link2, Shield, Bell } from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface ReferralData {
  code: string;
  link: string;
  stats: {
    total: number;
    pending: number;
    accepted: number;
    rewarded: number;
    rejected: number;
    rewardDaysEarned: number;
    rewardDaysCap: number;
  };
}

interface ReferralShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { icon: Link2, key: "referralModalStep1" as TranslationKey, descKey: "referralModalStep1Desc" as TranslationKey },
  { icon: Gift, key: "referralModalStep2" as TranslationKey, descKey: "referralModalStep2Desc" as TranslationKey },
  { icon: Crown, key: "referralModalStep3" as TranslationKey, descKey: "referralModalStep3Desc" as TranslationKey },
] as const;

const PRO_BENEFITS = [
  { icon: BarChart3, key: "referralModalProBenefit1" as TranslationKey },
  { icon: Bot, key: "referralModalProBenefit2" as TranslationKey },
  { icon: Link2, key: "referralModalProBenefit3" as TranslationKey },
  { icon: BarChart3, key: "referralModalProBenefit4" as TranslationKey },
  { icon: Shield, key: "referralModalProBenefit5" as TranslationKey },
  { icon: Bell, key: "referralModalProBenefit6" as TranslationKey },
] as const;

export default function ReferralShareModal({ isOpen, onClose }: ReferralShareModalProps) {
  const { t } = useI18n();
  const focusTrapRef = useFocusTrap(isOpen, onClose);
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch("/api/referral/code")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  const trackReferralEvent = useCallback((event: string) => {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    }).catch(() => {});
  }, []);

  const handleCopy = useCallback(async () => {
    if (!data?.link) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackReferralEvent("referral_link_copied");
    } catch {}
  }, [data?.link, trackReferralEvent]);

  const handleShare = useCallback(async () => {
    if (!data?.link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("referralShareTitle"),
          text: t("referralShareText"),
          url: data.link,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        trackReferralEvent("referral_link_shared");
      } catch {}
    } else {
      handleCopy();
    }
  }, [data?.link, t, handleCopy, trackReferralEvent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="referral-modal-title"
        className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 w-full max-h-[100dvh] sm:max-h-[90vh] sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col overflow-hidden"
      >
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 px-6 pt-8 pb-6 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-8 w-16 h-16 rounded-full bg-white/30 blur-xl" />
            <div className="absolute bottom-2 right-10 w-24 h-24 rounded-full bg-white/20 blur-2xl" />
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h2 id="referral-modal-title" className="relative text-xl font-bold text-white">
            {t("referralModalTitle")}
          </h2>
          <p className="relative text-sm text-emerald-100 mt-1">{t("referralSubtitle")}</p>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* How it works */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t("referralModalHowItWorks")}</h3>
            <div className="space-y-3">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t(step.key)}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{t(step.descKey)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* What you unlock with Pro */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2.5 flex items-center gap-2">
              <Crown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {t("referralModalProTitle")}
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {PRO_BENEFITS.map((benefit, i) => {
                const Icon = benefit.icon;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-slate-300">{t(benefit.key)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Referral link */}
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg" />
            </div>
          ) : data ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 font-mono truncate select-all">
                  {data.link}
                </div>
                <button
                  onClick={handleCopy}
                  className="shrink-0 p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  aria-label={t("referralCopy")}
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-500 dark:text-slate-400" />}
                </button>
              </div>
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors shadow-sm"
              >
                {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {t("referralModalCopyLink")}
              </button>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t("referralStatTotal"), value: data.stats.total },
                  { label: t("referralStatRewarded"), value: data.stats.rewarded },
                  { label: t("referralStatDaysEarned"), value: data.stats.rewardDaysEarned },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5 text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
