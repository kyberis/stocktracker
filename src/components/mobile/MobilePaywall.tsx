"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import TierIcon from "@/components/TierIcon";

interface MobilePaywallProps {
  onDismiss: () => void;
  surface?: string;
}

const BENEFITS = [
  { icon: "📊", key: "paywallBenefit1" },
  { icon: "🔔", key: "paywallBenefit2" },
  { icon: "📈", key: "paywallBenefit3" },
  { icon: "🏦", key: "paywallBenefit4" },
  { icon: "🤖", key: "paywallBenefit5" },
];

const BENEFIT_FALLBACK: Record<string, { en: string; es: string }> = {
  paywallBenefit1: { en: "Unlimited holdings & portfolios", es: "Holdings y portafolios ilimitados" },
  paywallBenefit2: { en: "Price alerts via push, email & WhatsApp", es: "Alertas de precio por push, email y WhatsApp" },
  paywallBenefit3: { en: "Advanced metrics, growth charts & screener", es: "Métricas avanzadas, gráficos de crecimiento y screener" },
  paywallBenefit4: { en: "Broker sync with 80+ brokerages", es: "Sincronización con 80+ brokers" },
  paywallBenefit5: { en: "AI-powered analysis & tax reports", es: "Análisis con IA e informes fiscales" },
};

export default function MobilePaywall({ onDismiss, surface }: MobilePaywallProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const track = useTrack();
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const startCheckout = useCallback(async (plan: "starter" | "pro") => {
    setCheckingOut(plan);
    track("mobile_paywall_checkout", { plan, surface: surface ?? "unknown" });
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval: "monthly" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setCheckingOut(null);
    }
  }, [track, surface]);

  const getBenefitText = (key: string) => {
    const translated = t(key as Parameters<typeof t>[0]);
    if (translated !== key) return translated;
    const fb = BENEFIT_FALLBACK[key];
    return fb?.en ?? key;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950 safe-area-top">
      {/* Close button */}
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
        {/* Logo + headline */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <svg className="w-8 h-8 text-white" viewBox="0 0 32 32">
              <g transform="translate(16,16) rotate(45)">
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="rgba(255,255,255,0.9)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="rgba(255,255,255,0.7)" transform="rotate(90)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="rgba(255,255,255,0.5)" transform="rotate(180)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="rgba(255,255,255,0.6)" transform="rotate(270)"/>
              </g>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Unlock Full Power</h1>
          <p className="text-sm text-emerald-200/70">Upgrade your portfolio tracking experience</p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-8">
          {BENEFITS.map((b) => (
            <div key={b.key} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-lg">{b.icon}</span>
              <span className="text-sm text-white/90">{getBenefitText(b.key)}</span>
            </div>
          ))}
        </div>

        {/* Pricing cards */}
        <div className="space-y-3">
          {/* Bifolio (Starter) */}
          <button
            onClick={() => startCheckout("starter")}
            disabled={checkingOut !== null}
            className="w-full p-4 rounded-2xl border border-blue-400/30 bg-blue-500/10 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TierIcon plan="starter" size={20} />
                <span className="text-base font-bold text-white">Bifolio</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-white">€2.99</span>
                <span className="text-xs text-blue-300">/mo</span>
              </div>
            </div>
            <p className="text-xs text-blue-200/80">50 holdings, alerts, metrics, broker sync</p>
            {checkingOut === "starter" && (
              <p className="text-xs text-blue-300 mt-2 animate-pulse">Redirecting to checkout...</p>
            )}
          </button>

          {/* Trefolio (Pro) — highlighted */}
          <button
            onClick={() => startCheckout("pro")}
            disabled={checkingOut !== null}
            className="w-full p-4 rounded-2xl border-2 border-emerald-400/50 bg-emerald-500/15 text-left relative active:scale-[0.98] transition-transform"
          >
            <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white uppercase tracking-wide">
              Most Popular
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TierIcon plan="pro" size={20} />
                <span className="text-base font-bold text-white">Trefolio</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-white">€7.99</span>
                <span className="text-xs text-emerald-300">/mo</span>
              </div>
            </div>
            <p className="text-xs text-emerald-200/80">Unlimited everything, AI analysis, tax reports, screener</p>
            {checkingOut === "pro" && (
              <p className="text-xs text-emerald-300 mt-2 animate-pulse">Redirecting to checkout...</p>
            )}
          </button>
        </div>

        {/* Trial info */}
        <p className="text-center text-xs text-white/40 mt-4">
          7-day free trial • Cancel anytime
        </p>
      </div>
    </div>
  );
}
