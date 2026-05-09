"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { trackCanonicalConversion } from "@/lib/ad-tracking";
import { getUpsellConfig, getUpsellReasonKey } from "@/lib/upsell";
import type { UpsellReason, UpsellSurface } from "@/lib/upsell";
import type { TranslationKey } from "@/lib/i18n";
import TierIcon from "@/components/TierIcon";
import QuotaCompareTable from "@/components/QuotaCompareTable";
import { resolveBillingPortalHref, resolveIdpUpgradeHref } from "@/lib/idp/config";

interface CapacityInfo {
  available: boolean;
}

let cachedCapacity: { data: CapacityInfo; fetchedAt: number } | null = null;
const CAPACITY_CACHE_MS = 60_000;

type BillingPeriod = "monthly" | "annual";

/** Matches landing Trefolio list: 1–22 and 24 (23 omitted). */
const TREFOLIO_COMPARE_FEATURE_KEYS = [
  ...Array.from({ length: 22 }, (_, i) => `landingPricingTrefolioFeature${i + 1}` as TranslationKey),
  "landingPricingTrefolioFeature24" as TranslationKey,
];

interface TierInfo {
  name: string;
  plan: "free" | "pro";
  regularMonthly: string;
  monthlyPrice: string;
  regularAnnualMonthly: string;
  annualMonthly: string;
  regularAnnual: string;
  annualPrice: string;
  annualSavePct: number;
  launchDiscountPct: number;
  isFree?: boolean;
  descriptionKey: TranslationKey;
  featureKeys: TranslationKey[];
  highlighted?: boolean;
}

const TIERS: TierInfo[] = [
  {
    name: "Folio",
    plan: "free",
    regularMonthly: "€0", monthlyPrice: "€0",
    regularAnnualMonthly: "€0", annualMonthly: "€0",
    regularAnnual: "€0", annualPrice: "€0",
    annualSavePct: 0, launchDiscountPct: 0, isFree: true,
    descriptionKey: "landingPricingFolioDesc",
    featureKeys: Array.from({ length: 15 }, (_, i) => `landingPricingFolioFeature${i + 1}` as TranslationKey),
  },
  {
    name: "Trefolio",
    plan: "pro",
    regularMonthly: "€9.99", monthlyPrice: "€7.99",
    regularAnnualMonthly: "€6.67", annualMonthly: "€5.00",
    regularAnnual: "€79.99", annualPrice: "€59.99",
    annualSavePct: 37, launchDiscountPct: 20,
    descriptionKey: "landingPricingTrefolioDesc",
    featureKeys: TREFOLIO_COMPARE_FEATURE_KEYS,
    highlighted: true,
  },
];

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
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const hasTrackedShown = useRef(false);

  const isPro = user?.plan === "pro";
  const isFree = !isPro;
  const config = getUpsellConfig(surface);
  const reasonLabel = t(getUpsellReasonKey(reason));
  const isAnnual = billingPeriod === "annual";

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

  const startCheckout = async (interval: BillingPeriod) => {
    setBillingError("");
    setBillingLoading(`pro_${interval}`);
    track("upgrade_compare_clicked", {
      surface,
      plan: "pro",
      planInterval: interval,
      reason: reason || "upgrade_required",
    });
    track("billing_checkout_started", { interval, source: "compare_card", plan: "pro" });
    await trackCanonicalConversion("checkout_started", {
      plan: "pro",
      interval,
      source: "compare_card",
    });
    window.location.href = resolveIdpUpgradeHref({ interval });
    setBillingLoading("");
  };

  const openPortal = () => {
    setBillingError("");
    setBillingLoading("portal");
    track("billing_portal_opened", { source: "compare_card" });
    window.location.href = resolveBillingPortalHref();
  };

  const atCapacity = capacity !== null && !capacity.available;
  const currentPlan = isPro ? "pro" : "free";

  const currentTier = TIERS.find((x) => x.plan === currentPlan)!;
  const upgradeTiers = TIERS.filter((x) => x.plan === "pro" && currentPlan === "free");

  const maxFeatures = compact ? 5 : Infinity;

  const renderTierCard = (tier: TierInfo, options: { isCurrent: boolean; mobilePill?: string }) => {
    const { isCurrent } = options;
    const isHighlighted = tier.highlighted && !isCurrent;
    const canUpgradeTo = !isCurrent && isFree && tier.plan === "pro";
    const displayPrice = tier.isFree ? "€0" : isAnnual ? tier.annualMonthly : tier.monthlyPrice;
    const regularPrice = isAnnual ? tier.regularAnnualMonthly : tier.regularMonthly;
    const visibleFeatures = tier.featureKeys.slice(0, maxFeatures);
    const hiddenCount = tier.featureKeys.length - visibleFeatures.length;

    return (
      <div
        key={tier.plan}
        className={`relative rounded-xl p-4 flex flex-col transition-all ${
          isHighlighted
            ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-2 border-emerald-400 dark:border-emerald-500/40 shadow-lg shadow-emerald-500/5 dark:shadow-emerald-500/10"
            : isCurrent
              ? "bg-gray-50 dark:bg-slate-800/60 border-2 border-gray-300 dark:border-slate-500"
              : "bg-white dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700"
        }`}
      >
        {isHighlighted && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md shadow-emerald-500/25 whitespace-nowrap">
            {options.mobilePill || t("landingPricingMostPopular")}
          </div>
        )}
        {!isHighlighted && !isCurrent && canUpgradeTo && options.mobilePill && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md shadow-emerald-500/25 whitespace-nowrap">
            {options.mobilePill}
          </div>
        )}
        {isCurrent && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-600 dark:bg-slate-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md whitespace-nowrap">
            {t("upsellCurrentPlan")}
          </div>
        )}
        <div className="flex items-center gap-1.5 mb-2 mt-1">
          <TierIcon
            plan={tier.plan}
            size={18}
            className={
              tier.plan === "pro" ? "text-emerald-500" :
              "text-gray-500 dark:text-slate-400"
            }
          />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">{tier.name}</h4>
          {!tier.isFree && tier.launchDiscountPct > 0 && (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
              -{tier.launchDiscountPct}%
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5 mb-1">
          {!tier.isFree && (
            <span className="text-sm text-gray-400 dark:text-slate-500 line-through">{regularPrice}</span>
          )}
          <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{displayPrice}</span>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {tier.isFree ? "forever" : "/mo"}
          </span>
        </div>
        {!tier.isFree && isAnnual && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[11px] text-gray-400 dark:text-slate-500 line-through">{tier.regularAnnual}/yr</span>
            <span className="text-[11px] text-gray-600 dark:text-slate-400">{tier.annualPrice}/yr</span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              Save {tier.annualSavePct}%
            </span>
          </div>
        )}
        <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-3">
          {t(tier.descriptionKey)}
        </p>
        <ul className="space-y-1.5 mb-4 flex-1">
          {visibleFeatures.map((key) => (
            <li key={key} className="flex items-start gap-2 text-[11px]">
              <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-600 dark:text-slate-300">{t(key)}</span>
            </li>
          ))}
          {hiddenCount > 0 && (
            <li className="text-[11px] text-gray-400 dark:text-slate-500 pl-5.5">
              +{hiddenCount} {t("upsellMoreFeatures") || "more"}
            </li>
          )}
        </ul>
        {isCurrent ? (
          isPro ? (
            <button
              onClick={openPortal}
              disabled={billingLoading !== ""}
              className="w-full text-xs font-semibold py-2.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-60"
            >
              {billingLoading === "portal" ? t("billingRedirecting") : t("manageSubscription")}
            </button>
          ) : (
            <div className="w-full text-xs font-semibold py-2.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 text-center">
              {t("upsellCurrentPlan")}
            </div>
          )
        ) : canUpgradeTo && !atCapacity ? (
          <button
            onClick={() => startCheckout(billingPeriod)}
            disabled={billingLoading !== ""}
            className={`w-full text-xs font-semibold py-2.5 rounded-lg transition-all disabled:opacity-60 ${
              tier.highlighted
                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                : "bg-gray-800 dark:bg-slate-600 hover:bg-gray-700 dark:hover:bg-slate-500 text-white"
            }`}
          >
            {billingLoading === `pro_${billingPeriod}`
              ? t("billingRedirecting")
              : isAnnual
                ? `${tier.name} — ${tier.annualPrice}/yr`
                : `${tier.name} — ${tier.monthlyPrice}/mo`
            }
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/80 p-5 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="text-center mb-5">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {t("upsellCompareTitle")}
          </h3>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
            {reasonLabel}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {t(config.subtitleKey)}
        </p>

        {/* Context: what was attempted */}
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
          <span className="font-medium text-gray-700 dark:text-slate-300">{t("upsellTriedTo")} </span>
          {t(config.attemptedActionKey)}
        </p>

        {aiUsage && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                  style={{ width: `${Math.min((aiUsage.used / aiUsage.limit) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 tabular-nums shrink-0">
                {Math.round((aiUsage.used / aiUsage.limit) * 100)}%
              </span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">
              {t("aiTokensUsed").replace("{used}", aiUsage.used.toLocaleString()).replace("{limit}", aiUsage.limit.toLocaleString())}
              {aiUsage.limit > aiUsage.used && (
                <> · {t("aiAnalysesRemaining").replace("{count}", String(Math.floor((aiUsage.limit - aiUsage.used) / 3000)))}</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Billing toggle */}
      {!isPro && (
        <div className="flex items-center justify-center gap-3 mb-5">
          <span
            className={`text-xs font-medium cursor-pointer transition-colors ${
              !isAnnual ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-slate-500"
            }`}
            onClick={() => setBillingPeriod("monthly")}
          >
            {t("landingPricingToggleMonthly")}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isAnnual}
            aria-label="Toggle annual billing"
            onClick={() => setBillingPeriod(isAnnual ? "monthly" : "annual")}
            className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              isAnnual ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                isAnnual ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
          <span
            className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
              isAnnual ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-slate-500"
            }`}
            onClick={() => setBillingPeriod("annual")}
          >
            <span className="text-xs font-medium">{t("landingPricingToggleAnnually")}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border transition-colors ${
              isAnnual
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 animate-pulse"
            }`}>
              {t("landingPricingSavePct")}
            </span>
          </span>
        </div>
      )}

      {/* At capacity warning */}
      {atCapacity && (
        <p className="text-xs text-center text-red-600 dark:text-red-400 font-medium py-2 mb-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          {t("proAtCapacity")}
        </p>
      )}

      {/* Compact / Mobile: collapsed current plan + focused upgrade cards */}
      <div className={compact ? "space-y-3" : "sm:hidden space-y-3"}>
        {/* Current plan one-liner */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700">
          <TierIcon
            plan={currentTier.plan}
            size={14}
            className="text-gray-400 dark:text-slate-500"
          />
          <span className="text-[11px] text-gray-500 dark:text-slate-400">{t("upsellYourPlan")}</span>
          <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 ml-auto">
            {currentTier.name} ({currentTier.isFree ? "Free" : isAnnual ? currentTier.annualMonthly + "/mo" : currentTier.monthlyPrice + "/mo"})
          </span>
        </div>

        {/* Upgrade target cards */}
        {upgradeTiers.map((tier, i) =>
          renderTierCard(tier, {
            isCurrent: false,
            mobilePill: i === 0 ? t("upsellRecommended") : undefined,
          })
        )}
      </div>

      {/* Desktop: 2-column grid */}
      {!compact && (
        <div className="hidden sm:grid gap-3 sm:grid-cols-2">
          {TIERS.map((tier) =>
            renderTierCard(tier, { isCurrent: tier.plan === currentPlan })
          )}
        </div>
      )}

      {/* Quota comparison table — replaces "Pro only" feature lists with explicit quotas */}
      <div className="mt-5 pt-5 border-t border-gray-100 dark:border-slate-700/60">
        <QuotaCompareTable />
      </div>

      {/* Billing error */}
      {billingError && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-3 text-center">{billingError}</p>
      )}

      {/* Referral CTA */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700/50 text-center">
        <a
          href="/profile?section=referrals"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          {t("referralCta")}
        </a>
      </div>
    </div>
  );
}
