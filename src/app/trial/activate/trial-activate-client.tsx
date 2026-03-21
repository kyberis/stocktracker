"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TranslationKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme-context";
import { FeatureFlagProvider, useFeatureFlag } from "@/lib/feature-flag-context";

function tOr(t: (k: TranslationKey) => string, key: TranslationKey, fallback: string) {
  const v = t(key);
  return v === key ? fallback : v;
}

const ROWS: { feature: string; free: string; pro: string }[] = [
  { feature: "Holdings", free: "Up to 15", pro: "Unlimited" },
  { feature: "Portfolios", free: "1", pro: "Up to 5" },
  { feature: "AI Analysis", free: "5 calls/month", pro: "30 calls/day" },
  { feature: "Price Alerts", free: "3 alerts", pro: "Unlimited" },
  { feature: "Fundamentals", free: "—", pro: "Full access" },
  { feature: "Stock Screener", free: "—", pro: "600+ stocks" },
  { feature: "Tax Reports", free: "—", pro: "5 EU countries" },
  { feature: "Portfolio Sharing", free: "—", pro: "Public link" },
  { feature: "WhatsApp Alerts", free: "—", pro: "Included" },
];

function TrialActivateInner({ token }: { token: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const trialEnabled = useFeatureFlag("pro_trial_enabled");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!trialEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100 dark:bg-slate-950">
        <p className="text-sm text-slate-600 dark:text-slate-400">This trial offer is no longer available.</p>
      </div>
    );
  }

  const heading = tOr(t, "trialActivateHeading" as TranslationKey, "Your Pro Trial Awaits");
  const sub = tOr(t, "trialActivateSub" as TranslationKey, "Unlock everything in Trefolio Pro for 7 days — free.");

  async function handleActivate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/trial/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not activate trial. Please try again.");
        return;
      }
      router.push("/trial/welcome");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-slate-100 dark:bg-slate-950 safe-area-top">
      <div className="w-full max-w-[600px] rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/10 dark:shadow-black/40 p-6 sm:p-8">
        <div className="text-center mb-8">
          <p className="text-lg font-semibold tracking-tight text-emerald-600 dark:text-emerald-500 mb-1">trefolio</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-2">{heading}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{sub}</p>
          {user?.email ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">Signed in as {user.email}</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-8">
          <div className="grid grid-cols-3 gap-0 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">Feature</div>
            <div className="px-3 py-2.5 border-b border-l border-slate-200 dark:border-slate-700 text-center">Free</div>
            <div className="px-3 py-2.5 border-b border-l border-slate-200 dark:border-slate-700 text-center text-emerald-700 dark:text-emerald-400">
              Pro
            </div>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {ROWS.map((row) => (
              <div key={row.feature} className="grid grid-cols-3 text-sm">
                <div className="px-3 py-2.5 text-slate-700 dark:text-slate-300">{row.feature}</div>
                <div className="px-3 py-2.5 border-l border-slate-200 dark:border-slate-700 text-center text-slate-600 dark:text-slate-400">
                  {row.free}
                </div>
                <div className="px-3 py-2.5 border-l border-slate-200 dark:border-slate-700 text-center font-medium text-slate-900 dark:text-white">
                  {row.pro}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <div
            className="mb-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-800 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleActivate}
            disabled={loading}
            className="w-full sm:w-auto min-w-[240px] rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? "Activating…" : "Activate Trefolio Pro"}
          </button>
          <p className="text-center text-xs text-slate-500 dark:text-slate-500 max-w-md leading-relaxed">
            No credit card required. After 7 days, your account returns to the Free plan — no surprises.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TrialActivateClient({ token }: { token: string }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FeatureFlagProvider>
          <I18nProvider>
            <TrialActivateInner token={token} />
          </I18nProvider>
        </FeatureFlagProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
