"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { getUpsellConfig, getUpsellReasonKey, getUpgradeTarget } from "@/lib/upsell";
import type { UpsellReason, UpsellSurface } from "@/lib/upsell";
import TierIcon from "@/components/TierIcon";

interface CapacityInfo {
  available: boolean;
}

let cachedCapacity: { data: CapacityInfo; fetchedAt: number } | null = null;
const CAPACITY_CACHE_MS = 60_000;

interface ProCompareCardProps {
  surface: UpsellSurface;
  reason?: UpsellReason;
  compact?: boolean;
  aiUsage?: {
    used: number;
    limit: number;
  };
  className?: string;
}

export default function ProCompareCard({
  surface,
  reason,
  compact = false,
  aiUsage,
  className = "",
}: ProCompareCardProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const track = useTrack();
  const [billingError, setBillingError] = useState("");
  const [billingLoading, setBillingLoading] = useState("");
  const [capacity, setCapacity] = useState<CapacityInfo | null>(null);
  const hasTrackedShown = useRef(false);

  const isPro = user?.plan === "pro";
  const isStarter = user?.plan === "starter";
  const isFree = !isPro && !isStarter;
  const config = getUpsellConfig(surface);
  const reasonLabel = t(getUpsellReasonKey(reason));
  const upgradeTarget = user ? getUpgradeTarget(user.plan as "free" | "starter" | "pro") : "starter";

  const fetchCapacity = useCallback(async () => {
    if (cachedCapacity && Date.now() - cachedCapacity.fetchedAt < CAPACITY_CACHE_MS) {
      setCapacity(cachedCapacity.data);
      return;
    }
    try {
      const res = await fetch("/api/billing/capacity");
      if (res.ok) {
        const data: CapacityInfo = await res.json();
        cachedCapacity = { data, fetchedAt: Date.now() };
        setCapacity(data);
      }
    } catch {
      // silently fail — buttons stay enabled
    }
  }, []);

  useEffect(() => {
    if (!isPro) fetchCapacity();
  }, [isPro, fetchCapacity]);

  useEffect(() => {
    if (hasTrackedShown.current) return;
    hasTrackedShown.current = true;
    track("upgrade_compare_shown", {
      surface,
      feature: config.feature,
      reason: reason || "upgrade_required",
    });
  }, [track, surface, config.feature, reason]);

  const startCheckout = async (plan: "starter" | "pro", interval: "monthly" | "annual") => {
    setBillingError("");
    setBillingLoading(`${plan}_${interval}`);
    track("upgrade_compare_clicked", {
      surface,
      plan,
      planInterval: interval,
      reason: reason || "upgrade_required",
    });
    track("billing_checkout_started", { interval, source: "compare_card", plan });
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setBillingError(data?.error || t("billingCheckoutError"));
        setBillingLoading("");
        return;
      }
      window.location.href = data.url as string;
    } catch {
      setBillingError(t("billingCheckoutError"));
      setBillingLoading("");
    }
  };

  const openPortal = () => {
    setBillingError("");
    setBillingLoading("portal");
    track("billing_portal_opened", { source: "compare_card" });
    window.location.href = "/api/billing/portal";
  };

  const atCapacity = capacity !== null && !capacity.available;

  return (
    <div className={`rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/10 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{t("upsellCompareTitle")}</p>
          <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">{t(config.subtitleKey)}</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
          {reasonLabel}
        </span>
      </div>

      <p className="text-xs text-gray-600 dark:text-slate-300 mt-3">
        <span className="font-medium">{t("upsellTriedTo")} </span>
        {t(config.attemptedActionKey)}
      </p>

      {aiUsage && (
        <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">
          {t("aiUsageThisMonth")}: {aiUsage.used}/{aiUsage.limit}
        </p>
      )}

      <div className={`mt-3 grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"}`}>
        {/* Folio column */}
        <div className={`rounded-lg border p-3 ${isFree ? "border-gray-400 dark:border-slate-500 bg-gray-50/80 dark:bg-slate-700/50" : "border-gray-200 dark:border-slate-600 bg-white/90 dark:bg-slate-800"}`}>
          <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-1"><TierIcon plan="free" size={14} />{t("upsellFreeTitle")}</p>
          <ul className="mt-2 space-y-1">
            {config.freeItems.map((item) => (
              <li key={item} className="text-xs text-gray-600 dark:text-slate-300">- {t(item)}</li>
            ))}
          </ul>
        </div>

        {/* Bifolio column */}
        {(!isStarter || !isPro) && (
          <div className={`rounded-lg border p-3 ${isStarter ? "border-blue-400 dark:border-blue-500/40 bg-blue-50/50 dark:bg-blue-900/20" : "border-blue-300 dark:border-blue-500/30 bg-white dark:bg-slate-800"}`}>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1"><TierIcon plan="starter" size={14} />{t("upsellStarterTitle")} — €2.99/mo</p>
            <ul className="mt-2 space-y-1">
              {config.starterItems.map((item) => (
                <li key={item} className="text-xs text-gray-700 dark:text-slate-200">- {t(item)}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Trefolio column */}
        <div className={`rounded-lg border p-3 ${isPro ? "border-emerald-400 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-900/20" : "border-emerald-300 dark:border-emerald-500/40 bg-white dark:bg-slate-800"}`}>
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1"><TierIcon plan="pro" size={14} />{t("upsellProTitle")} — €7.99/mo</p>
          <ul className="mt-2 space-y-1">
            {config.proItems.map((item) => (
              <li key={item} className="text-xs text-gray-700 dark:text-slate-200">- {t(item)}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={`mt-3 ${compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-2"}`}>
        {isPro ? (
          <button
            onClick={openPortal}
            disabled={billingLoading !== ""}
            className="btn-secondary text-sm disabled:opacity-60"
          >
            {billingLoading === "portal" ? t("billingRedirecting") : t("manageSubscription")}
          </button>
        ) : atCapacity ? (
          <p className="text-xs text-center text-red-600 dark:text-red-400 font-medium py-2 col-span-full">
            {t("proAtCapacity")}
          </p>
        ) : (
          <>
            {isFree && (
              <>
                <button
                  onClick={() => startCheckout("starter", "monthly")}
                  disabled={billingLoading !== ""}
                  className="btn-secondary text-sm disabled:opacity-60"
                >
                  {billingLoading === "starter_monthly" ? t("billingRedirecting") : t("upgradeStarterMonthly")}
                </button>
                <button
                  onClick={() => startCheckout("starter", "annual")}
                  disabled={billingLoading !== ""}
                  className="btn-secondary text-sm disabled:opacity-60"
                >
                  {billingLoading === "starter_annual" ? t("billingRedirecting") : t("upgradeStarterAnnual")}
                </button>
              </>
            )}
            {upgradeTarget === "pro" || isFree ? (
              <>
                <button
                  onClick={() => startCheckout("pro", "monthly")}
                  disabled={billingLoading !== ""}
                  className="btn-primary text-sm disabled:opacity-60"
                >
                  {billingLoading === "pro_monthly" ? t("billingRedirecting") : t("upgradeMonthly")}
                </button>
                <button
                  onClick={() => startCheckout("pro", "annual")}
                  disabled={billingLoading !== ""}
                  className="btn-primary text-sm disabled:opacity-60"
                >
                  {billingLoading === "pro_annual" ? t("billingRedirecting") : t("upgradeAnnual")}
                </button>
              </>
            ) : null}
          </>
        )}
      </div>

      {billingError && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-2">{billingError}</p>
      )}
    </div>
  );
}
