"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import TierIcon from "@/components/TierIcon";
import { resolveIdpUpgradeHref } from "@/lib/idp/config";
import { PLAN_RANK, planOf } from "@/lib/plan-rank";
import type { SubscriptionPlan } from "@/lib/types";
import { useCommerceEnabled } from "@/lib/commerce";

interface MobilePaywallProps {
  onDismiss: () => void;
  surface?: string;
}

type BillingPeriod = "monthly" | "annual";

const PAID_PLANS: {
  plan: Exclude<SubscriptionPlan, "free">;
  monthly: string;
  annual: string;
  annualMonthly: string;
  highlighted?: boolean;
}[] = [
  { plan: "basic", monthly: "€4.99", annual: "€49", annualMonthly: "€4.08" },
  { plan: "pro", monthly: "€9.99", annual: "€89", annualMonthly: "€7.42", highlighted: true },
  { plan: "wealth", monthly: "€24.99", annual: "€199", annualMonthly: "€16.58" },
];

export default function MobilePaywall({ onDismiss, surface }: MobilePaywallProps) {
  const commerceEnabled = useCommerceEnabled();
  const { user } = useAuth();
  const { t } = useI18n();
  const track = useTrack();
  const [checkingOut, setCheckingOut] = useState("");
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const currentPlan = planOf(user);
  const isAnnual = period === "annual";

  const startCheckout = useCallback(async (plan: "basic" | "pro" | "wealth") => {
    setCheckingOut(plan);
    track("mobile_paywall_checkout", { plan, interval: period, surface: surface ?? "unknown" });
    window.location.href = resolveIdpUpgradeHref({ interval: period, plan, skipLanding: true });
  }, [track, surface, period]);

  if (!commerceEnabled) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950 safe-area-top">
      <div className="flex justify-end px-4 pt-3">
        <button
          onClick={() => {
            track("mobile_paywall_dismissed", { surface: surface ?? "unknown" });
            onDismiss();
          }}
          className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">{t("billingPageHeading")}</h1>
          <p className="text-sm text-emerald-200/70">{t("billingPageSubtitle")}</p>
          <p className="text-xs text-emerald-100/80 mt-3 leading-relaxed max-w-sm mx-auto">
            {t("tierDifferentiatorsSummaryShort")}
          </p>
          {PLAN_RANK[currentPlan] > PLAN_RANK.free && PLAN_RANK[currentPlan] < PLAN_RANK.wealth ? (
            <p className="text-[11px] text-emerald-100/70 mt-2 leading-relaxed max-w-sm mx-auto">
              {t("billingUpgradeProrationNote")}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => setPeriod("monthly")}
            className={`text-xs font-medium ${!isAnnual ? "text-white" : "text-white/40"}`}
          >
            {t("landingPricingToggleMonthly")}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={isAnnual}
            onClick={() => setPeriod(isAnnual ? "monthly" : "annual")}
            className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full ${
              isAnnual ? "bg-emerald-500" : "bg-white/20"
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              isAnnual ? "translate-x-5" : "translate-x-1"
            }`} />
          </button>
          <button
            type="button"
            onClick={() => setPeriod("annual")}
            className={`text-xs font-medium ${isAnnual ? "text-white" : "text-white/40"}`}
          >
            {t("landingPricingToggleAnnually")}
          </button>
        </div>

        <div className="space-y-3">
          {PAID_PLANS.filter((p) => PLAN_RANK[p.plan] > PLAN_RANK[currentPlan]).map((p) => {
            const name = p.plan === "wealth" ? "Wealth · Ultra" : p.plan === "pro" ? "Pro" : "Basic";
            const descKey =
              p.plan === "wealth" ? "landingPricingWealthDesc" :
              p.plan === "pro" ? "landingPricingProDesc" :
              "landingPricingBasicDesc";
            const price = isAnnual ? p.annualMonthly : p.monthly;
            const ctaPrice = isAnnual ? `${p.annual}/yr` : `${p.monthly}/mo`;
            return (
              <button
                key={p.plan}
                onClick={() => startCheckout(p.plan)}
                disabled={checkingOut !== ""}
                className={`w-full p-4 rounded-2xl text-left relative active:scale-[0.98] transition-transform disabled:opacity-60 ${
                  p.highlighted
                    ? "border-2 border-emerald-400/50 bg-emerald-500/15"
                    : "border border-white/15 bg-white/5"
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white uppercase tracking-wide">
                    {t("landingPricingMostPopular")}
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TierIcon
                      plan={p.plan}
                      size={20}
                      className={
                        p.plan === "wealth" ? "text-amber-300" :
                        p.plan === "pro" ? "text-emerald-300" :
                        "text-sky-300"
                      }
                    />
                    <span className="text-base font-bold text-white">{name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-white">{price}</span>
                    <span className="text-xs text-emerald-300">/mo</span>
                  </div>
                </div>
                <p className="text-xs text-emerald-200/80">{t(descKey)}</p>
                <p className="text-xs font-semibold text-white mt-2">
                  {checkingOut === p.plan ? t("billingRedirecting") : ctaPrice}
                </p>
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-white/40 mt-4">
          {t("landingPricingFooter")}
        </p>
      </div>
    </div>
  );
}
