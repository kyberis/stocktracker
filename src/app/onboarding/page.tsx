"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { FeatureFlagProvider, useFeatureFlag, useFeatureFlagContext } from "@/lib/feature-flag-context";
import { shouldRedirectCompletedOnboarding } from "@/lib/onboarding-import-phase";
import { skipOnboardingHomePath } from "@/lib/warren-first-stock";
import { SUPPORTED_PORTFOLIO_CURRENCIES } from "@/lib/db/helpers";
import { COUNTRIES } from "@/lib/countries";
import { getBrokersForCountry } from "@/lib/country-brokers";
import { getClaraLoginUrl } from "@/lib/clara-public-url";
import {
  CLARA_ONBOARDING_POLL_INTERVAL_MS,
  CLARA_WIZARD_STEP_INDEX,
  TRIAL_WIZARD_STEP_INDEX,
  WIZARD_STEP_COUNT,
  parseClaraOnboardingLinked,
  shouldAutoAdvancePastHiddenTrial,
  skipSetupTargetStep,
  wizardBackFromClara,
  type ClaraOnboardingActivation,
} from "@/lib/onboarding-clara-step";

function trackOnboardingEvent(event: string, metadata?: Record<string, string>) {
  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, metadata }),
  }).catch(() => {});
}

type ExperienceOption = "beginner" | "intermediate" | "experienced" | "professional";
type UseCaseOption = "track_portfolio" | "dividend_income" | "tax_reporting" | "research_stocks";
type ReferralSourceOption = "google" | "social_media" | "twitter" | "youtube" | "reddit" | "friend" | "other";

function StepIndicator({ current }: { current: number }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: WIZARD_STEP_COUNT }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < current
              ? "w-8 bg-emerald-500"
              : i === current
                ? "w-8 bg-emerald-400"
                : "w-4 bg-gray-200 dark:bg-slate-700"
          }`}
        />
      ))}
      <span className="sr-only">
        {t("onboardingStepOf").replace("{current}", String(current + 1)).replace("{total}", String(WIZARD_STEP_COUNT))}
      </span>
    </div>
  );
}

/* ── Step 0: Combined Profile + Experience + Tax Residency ── */

const EXPERIENCE_OPTIONS: { key: ExperienceOption; icon: string; color: string; bgColor: string }[] = [
  { key: "beginner", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25", color: "text-sky-600 dark:text-sky-400", bgColor: "bg-sky-100 dark:bg-sky-500/15" },
  { key: "intermediate", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-500/15" },
  { key: "experienced", icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941", color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-100 dark:bg-violet-500/15" },
  { key: "professional", icon: "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-500/15" },
];

function StepProfile({
  displayName,
  setDisplayName,
  hasExistingName,
  currency,
  setCurrency,
  experienceLevel,
  setExperienceLevel,
  taxResidency,
  setTaxResidency,
  onNext,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  hasExistingName: boolean;
  currency: string;
  setCurrency: (v: string) => void;
  experienceLevel: ExperienceOption | "";
  setExperienceLevel: (v: ExperienceOption) => void;
  taxResidency: string;
  setTaxResidency: (v: string) => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const [countrySearch, setCountrySearch] = useState("");
  const [editingName, setEditingName] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.toLowerCase();
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  useEffect(() => {
    if (taxResidency && listRef.current) {
      const el = listRef.current.querySelector(`[data-code="${taxResidency}"]`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [taxResidency]);

  return (
    <div className="space-y-5">
      {hasExistingName && !editingName ? (
        <div className="flex items-center gap-2 py-1">
          <span className="text-sm text-gray-700 dark:text-slate-300">
            👋 {displayName}
          </span>
          <button type="button" onClick={() => setEditingName(true)} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
            {t("edit")}
          </button>
        </div>
      ) : (
        <div>
          <label htmlFor="ob-name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
            {t("onboardingDisplayNameLabel")}
          </label>
          <input
            id="ob-name"
            type="text"
            maxLength={100}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("onboardingDisplayNamePlaceholder")}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 dark:placeholder:text-slate-500"
            autoFocus
          />
        </div>
      )}
      <div>
        <label htmlFor="ob-currency" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
          {t("onboardingDefaultCurrencyLabel")}
        </label>
        <select
          id="ob-currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {SUPPORTED_PORTFOLIO_CURRENCIES.map((cur) => (
            <option key={cur} value={cur}>{cur}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t("onboardingDefaultCurrencyHint")}</p>
      </div>

      {/* Experience Level (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
          {t("onboardingStepExperienceTitle")}
          <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-slate-500">({t("onboardingSkip").toLowerCase()})</span>
        </label>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">{t("onboardingExperienceHint")}</p>
        <div className="grid grid-cols-2 gap-2">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setExperienceLevel(opt.key)}
              className={`group flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all ${
                experienceLevel === opt.key
                  ? "border-emerald-400 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-500/5"
                  : "border-gray-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-500/30"
              }`}
            >
              <div className={`w-7 h-7 rounded-md ${opt.bgColor} flex items-center justify-center shrink-0`}>
                <svg className={`w-3.5 h-3.5 ${opt.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-900 dark:text-white leading-tight">
                {t(`onboardingExperience_${opt.key}` as never)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tax Residency (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
          {t("onboardingStep2Title")}
          <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-slate-500">({t("onboardingSkip").toLowerCase()})</span>
        </label>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">{t("onboardingTaxResidencyHint")}</p>

        {taxResidency && !countrySearch && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5">
            <span className="text-base leading-none">{COUNTRIES.find((c) => c.code === taxResidency)?.flag}</span>
            <span className="flex-1 text-sm text-emerald-700 dark:text-emerald-300">{COUNTRIES.find((c) => c.code === taxResidency)?.name}</span>
            <button type="button" onClick={() => setTaxResidency("")} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
            placeholder={t("onboardingSearchCountry")}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
        </div>

        {countrySearch.trim() && (
          <div ref={listRef} className="mt-2 rounded-lg border border-gray-200 dark:border-slate-600 divide-y divide-gray-100 dark:divide-slate-700">
            {filteredCountries.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-3">No results</p>
            ) : (
              filteredCountries.slice(0, 5).map((c) => (
                <button
                  key={c.code}
                  data-code={c.code}
                  type="button"
                  onClick={() => { setTaxResidency(c.code); setCountrySearch(""); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    taxResidency === c.code
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 text-xs">{c.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <button onClick={onNext} className="btn-primary w-full">
        {t("onboardingContinue")}
      </button>
    </div>
  );
}

/* ── Step 1: Use Case (multi-select) ── */

const USE_CASE_OPTIONS: { key: UseCaseOption; icon: string; color: string; bgColor: string }[] = [
  { key: "track_portfolio", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-500/15" },
  { key: "dividend_income", icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-sky-600 dark:text-sky-400", bgColor: "bg-sky-100 dark:bg-sky-500/15" },
  { key: "tax_reporting", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z", color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-100 dark:bg-violet-500/15" },
  { key: "research_stocks", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-500/15" },
];

function StepUseCase({
  selected,
  setSelected,
  onNext,
  onSkip,
}: {
  selected: UseCaseOption[];
  setSelected: (v: UseCaseOption[]) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();

  const toggle = (key: UseCaseOption) => {
    setSelected(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-500 dark:text-slate-400">{t("onboardingUseCaseHint")}</p>
        <span className="shrink-0 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded px-1.5 py-0.5">
          {t("onboardingUseCaseBadge")}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {USE_CASE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => toggle(opt.key)}
            className={`group flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
              selected.includes(opt.key)
                ? "border-emerald-400 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-500/5 shadow-sm"
                : "border-gray-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:shadow-sm"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg ${opt.bgColor} flex items-center justify-center shrink-0`}>
              <svg className={`w-4.5 h-4.5 ${opt.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {t(`onboardingUseCase_${opt.key}` as never)}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {t(`onboardingUseCase_${opt.key}_desc` as never)}
              </p>
            </div>
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
              selected.includes(opt.key)
                ? "bg-emerald-500 border-emerald-500"
                : "border-gray-300 dark:border-slate-500"
            }`}>
              {selected.includes(opt.key) && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onSkip} className="btn-secondary flex-1">
          {t("onboardingSkip")}
        </button>
        <button onClick={onNext} disabled={selected.length === 0} className="btn-primary flex-1 disabled:opacity-40">
          {t("onboardingContinue")}
        </button>
      </div>
    </div>
  );
}

/* ── Step 2: Referral Source (single-select) ── */

const REFERRAL_SOURCE_OPTIONS: { key: ReferralSourceOption; icon: string; color: string; bgColor: string }[] = [
  { key: "google", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z", color: "text-sky-600 dark:text-sky-400", bgColor: "bg-sky-100 dark:bg-sky-500/15" },
  { key: "social_media", icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z", color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-100 dark:bg-violet-500/15" },
  { key: "twitter", icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z", color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-100 dark:bg-indigo-500/15" },
  { key: "youtube", icon: "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z", color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-500/15" },
  { key: "reddit", icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-500/15" },
  { key: "friend", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z", color: "text-teal-600 dark:text-teal-400", bgColor: "bg-teal-100 dark:bg-teal-500/15" },
  { key: "other", icon: "M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z", color: "text-gray-600 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-slate-700" },
];

function StepReferralSource({
  selected,
  setSelected,
  onNext,
  onSkip,
}: {
  selected: ReferralSourceOption | "";
  setSelected: (v: ReferralSourceOption) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-slate-400">{t("onboardingReferralSourceHint")}</p>
      <div className="grid grid-cols-1 gap-2.5">
        {REFERRAL_SOURCE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSelected(opt.key)}
            className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
              selected === opt.key
                ? "border-emerald-400 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-500/5 shadow-sm"
                : "border-gray-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:shadow-sm"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg ${opt.bgColor} flex items-center justify-center shrink-0`}>
              <svg className={`w-4 h-4 ${opt.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white flex-1">
              {t(`onboardingReferralSource_${opt.key}` as never)}
            </p>
            <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              selected === opt.key ? "border-emerald-500" : "border-gray-300 dark:border-slate-500"
            }`}>
              {selected === opt.key && (
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onSkip} className="btn-secondary flex-1">
          {t("onboardingSkip")}
        </button>
        <button onClick={onNext} disabled={!selected} className="btn-primary flex-1 disabled:opacity-40">
          {t("onboardingContinue")}
        </button>
      </div>
    </div>
  );
}

/* ── Step 3: Trial ── */

function StepTrial({
  onActivate,
  onSkip,
}: {
  onActivate: () => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    fetch("/api/auth/onboarding/trial-shown", { method: "POST" }).catch(() => {});
  }, []);

  const benefits = [
    t("onboardingTrialBenefit1"),
    t("onboardingTrialBenefit2"),
    t("onboardingTrialBenefit3"),
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-slate-400">{t("onboardingTrialSubtitle")}</p>
      <ul className="space-y-3">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex gap-3 text-sm text-gray-700 dark:text-slate-300">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" aria-hidden>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 pt-1">
        <button
          type="button"
          onClick={onActivate}
          className="btn-primary min-h-11 w-full"
        >
          {t("onboardingTrialActivate")}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="btn-secondary min-h-11 w-full"
        >
          {t("onboardingTrialSkip")}
        </button>
      </div>
    </div>
  );
}

/* ── Step 4: Clara activate (optional SSO) ── */

function StepClaraActivate({
  onLinked,
  onSkip,
  saving,
}: {
  onLinked: () => void;
  onSkip: () => void;
  saving: boolean;
}) {
  const { t } = useI18n();
  const [linked, setLinked] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const viewedRef = useRef(false);
  const onLinkedRef = useRef(onLinked);
  onLinkedRef.current = onLinked;

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackOnboardingEvent("onboarding_clara_step_viewed");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/clara/status", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: unknown = await res.json();
        if (!cancelled && parseClaraOnboardingLinked(data)) {
          setLinked(true);
        }
      } catch {
        // Keep polling; skip remains available.
      }
    };

    void poll();
    const id = window.setInterval(poll, CLARA_ONBOARDING_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!linked) return;
    if (saving) return;
    const timeout = window.setTimeout(() => {
      onLinkedRef.current();
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [linked, saving]);

  const handleActivate = () => {
    setWaiting(true);
    trackOnboardingEvent("onboarding_clara_activate_clicked");
    window.open(getClaraLoginUrl(), "_blank", "noopener,noreferrer");
  };

  const handleSkip = () => {
    if (linked || saving) return;
    onSkip();
  };

  const bullets = [
    t("onboardingClaraBullet1"),
    t("onboardingClaraBullet2"),
    t("onboardingClaraBullet3"),
  ];

  let statusMessage: string | null = null;
  if (linked) statusMessage = t("onboardingClaraLinked");
  else if (waiting) statusMessage = t("onboardingClaraWaiting");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          className="inline-block shrink-0 overflow-hidden rounded-full ring-2 ring-sky-500/30"
          style={{ width: 48, height: 48 }}
          aria-hidden="true"
        >
          <Image
            src="/avatars/clara-512.png"
            alt=""
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{t("claraName")}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("claraModalRole")}</p>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-slate-400">{t("onboardingClaraSubtitle")}</p>

      <ul className="space-y-3">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-3 text-sm text-gray-700 dark:text-slate-300">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400" aria-hidden>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-gray-400 dark:text-slate-500">{t("onboardingClaraFreeNote")}</p>

      {statusMessage && (
        <p className="text-sm text-sky-700 dark:text-sky-300" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}

      <div className="flex flex-col gap-3 pt-1">
        <button
          type="button"
          onClick={handleActivate}
          disabled={saving || linked}
          className="btn-primary min-h-11 w-full disabled:opacity-60"
        >
          {t("onboardingClaraActivate")}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={saving || linked}
          className="btn-secondary min-h-11 w-full disabled:opacity-60"
        >
          {t("onboardingClaraSkip")}
        </button>
      </div>

      <p className="text-xs text-gray-400 dark:text-slate-500">{t("onboardingClaraSisterNote")}</p>
      <p className="text-xs text-gray-400 dark:text-slate-500">{t("onboardingClaraDisclaimer")}</p>
    </div>
  );
}

/* ── Post-wizard: Import ── */

type ImportChoice = "broker_sync" | "csv" | "ai" | "skip";

function StepImport({
  country,
  onFinish,
  saving,
}: {
  country: string;
  onFinish: (method: ImportChoice) => void;
  saving: boolean;
}) {
  const { t } = useI18n();
  const brokers = getBrokersForCountry(country);
  const topBrokers = brokers.slice(0, 3);

  const options: { key: ImportChoice; icon: string; color: string; bgColor: string }[] = [
    { key: "broker_sync", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-500/15" },
    { key: "csv", icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5", color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-100 dark:bg-violet-500/15" },
    { key: "ai", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z", color: "text-sky-600 dark:text-sky-400", bgColor: "bg-sky-100 dark:bg-sky-500/15" },
    { key: "skip", icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-500/15" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-slate-400">{t("onboardingImportHint")}</p>

      {topBrokers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topBrokers.map((b) => (
            <span key={b.name} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400">
              {b.name}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onFinish(opt.key)}
            disabled={saving}
            className="group rounded-xl border border-gray-200 dark:border-slate-600 p-4 text-left hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all hover:shadow-md disabled:opacity-60"
          >
            <div className={`w-10 h-10 mb-2.5 rounded-xl ${opt.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <svg className={`w-5 h-5 ${opt.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {opt.key === "skip" ? t("onboardingSkip") : t(`onboardingImport_${opt.key}` as never)}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {opt.key === "skip" ? t("onboardingSkipSetup") : t(`onboardingImport_${opt.key}_desc` as never)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

const IMPORT_REDIRECTS: Record<ImportChoice, string> = {
  broker_sync: "/import?method=snaptrade_api",
  csv: "/import?method=broker_csv",
  ai: "/import?method=ai_import",
  skip: skipOnboardingHomePath(),
};

type OnboardingPhase = "wizard" | "importProposal";

function OnboardingContent() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { t } = useI18n();
  const trialEnabled = useFeatureFlag("pro_trial_enabled");
  const commerceEnabled = useFeatureFlag("commerce_enabled");
  const { isLoaded: flagsLoaded } = useFeatureFlagContext();
  const [phase, setPhase] = useState<OnboardingPhase>("wizard");
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceOption | "">("");
  const [taxResidency, setTaxResidency] = useState("");
  const [useCase, setUseCase] = useState<UseCaseOption[]>([]);
  const [referralSource, setReferralSource] = useState<ReferralSourceOption | "">("");
  const [saving, setSaving] = useState(false);
  const trialChoiceRef = useRef<boolean | undefined>(undefined);
  const stayingForImportRef = useRef(false);
  const completingRef = useRef(false);

  const showTrialStep = flagsLoaded && trialEnabled && commerceEnabled && !user?.trialActivatedAt;

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user?.displayName]);

  useEffect(() => {
    if (
      shouldRedirectCompletedOnboarding({
        onboardingCompleted: !!user?.onboardingCompleted,
        phase,
        stayingForImport: stayingForImportRef.current,
      })
    ) {
      router.replace("/");
    }
  }, [user?.onboardingCompleted, phase, router]);

  const completeOnboarding = useCallback(async (opts?: {
    activateTrial?: boolean;
    claraActivation?: ClaraOnboardingActivation;
  }) => {
    if (completingRef.current) return;
    completingRef.current = true;
    setSaving(true);
    try {
      const activateTrial = opts?.activateTrial ?? trialChoiceRef.current;
      const body: Record<string, unknown> = {
        displayName,
        defaultCurrency: currency,
        taxResidency: taxResidency || undefined,
        experienceLevel: experienceLevel || undefined,
        useCase: useCase.length > 0 ? useCase : undefined,
        referralSource: referralSource || undefined,
      };
      if (activateTrial === true) body.activateTrial = true;
      if (activateTrial === false) body.activateTrial = false;
      if (opts?.claraActivation) body.claraActivation = opts.claraActivation;

      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        stayingForImportRef.current = true;
        setPhase("importProposal");
        await refreshUser();
      } else {
        completingRef.current = false;
      }
    } catch {
      completingRef.current = false;
    }
    setSaving(false);
  }, [displayName, currency, taxResidency, experienceLevel, useCase, referralSource, refreshUser]);

  useEffect(() => {
    if (
      !shouldAutoAdvancePastHiddenTrial({
        phase,
        step,
        flagsLoaded,
        showTrial: showTrialStep,
      })
    ) {
      return;
    }
    setStep(CLARA_WIZARD_STEP_INDEX);
  }, [phase, step, flagsLoaded, showTrialStep]);

  const handleImportChoice = useCallback(async (importMethod: ImportChoice) => {
    stayingForImportRef.current = false;
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "onboarding_import_method",
        metadata: { method: importMethod },
      }),
    }).catch(() => {});
    router.replace(IMPORT_REDIRECTS[importMethod]);
  }, [router]);

  const stepTitles = [
    t("onboardingStep1Title"),
    t("onboardingStepUseCaseTitle"),
    t("onboardingStepReferralSourceTitle"),
    t("onboardingStepTrialTitle"),
    t("onboardingStepClaraTitle"),
  ];

  const cardTitle =
    phase === "importProposal"
      ? t("onboardingImportAfterTrialTitle")
      : stepTitles[step];

  return (
    <main className="flex-1 flex px-4 py-12">
      <div className="w-full max-w-md m-auto">
        <div className="text-center mb-6">
          <Link href="/landing" className="inline-flex items-center gap-2.5 mb-3">
            <svg className="w-10 h-10 rounded-xl shadow-lg shadow-emerald-500/20" viewBox="0 0 32 32">
              <defs>
                <linearGradient id="ob-a" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#6ee7b7"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
                <linearGradient id="ob-b" x1="0" y1=".3" x2="1" y2=".7"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient>
                <linearGradient id="ob-c" x1=".5" y1="1" x2=".5" y2="0"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#047857"/></linearGradient>
                <linearGradient id="ob-d" x1="1" y1=".3" x2="0" y2=".7"><stop offset="0%" stopColor="#a7f3d0"/><stop offset="100%" stopColor="#34d399"/></linearGradient>
              </defs>
              <rect width="32" height="32" rx="7" fill="#0f172a"/>
              <g transform="translate(16,16) rotate(45)">
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#ob-a)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#ob-b)" transform="rotate(90)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#ob-c)" transform="rotate(180)"/>
                <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#ob-d)" transform="rotate(270)"/>
                <circle cx="0" cy="0" r="1.2" fill="#0f172a" opacity=".35"/>
              </g>
            </svg>
            <span className="text-xl font-bold text-gray-900 dark:text-white">trefolio</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("onboardingTitle")}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t("onboardingSubtitle")}</p>
        </div>

        <div className="card p-6">
          {phase === "wizard" && <StepIndicator current={step} />}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{cardTitle}</h2>

          {phase === "importProposal" && (
            <StepImport
              country={taxResidency}
              onFinish={handleImportChoice}
              saving={false}
            />
          )}

          {phase === "wizard" && step === 0 && (
            <StepProfile
              displayName={displayName}
              setDisplayName={setDisplayName}
              hasExistingName={!!user?.displayName}
              currency={currency}
              setCurrency={setCurrency}
              experienceLevel={experienceLevel}
              setExperienceLevel={setExperienceLevel}
              taxResidency={taxResidency}
              setTaxResidency={setTaxResidency}
              onNext={() => setStep(1)}
            />
          )}
          {phase === "wizard" && step === 1 && (
            <StepUseCase
              selected={useCase}
              setSelected={setUseCase}
              onNext={() => setStep(2)}
              onSkip={() => setStep(2)}
            />
          )}
          {phase === "wizard" && step === 2 && (
            <StepReferralSource
              selected={referralSource}
              setSelected={setReferralSource}
              onNext={() => setStep(3)}
              onSkip={() => setStep(3)}
            />
          )}
          {phase === "wizard" && step === 3 && showTrialStep && (
            <StepTrial
              onActivate={() => {
                trialChoiceRef.current = true;
                setStep(CLARA_WIZARD_STEP_INDEX);
              }}
              onSkip={() => {
                trialChoiceRef.current = false;
                setStep(CLARA_WIZARD_STEP_INDEX);
              }}
            />
          )}
          {phase === "wizard" && step === TRIAL_WIZARD_STEP_INDEX && flagsLoaded && !showTrialStep && (
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">{t("onboardingSaving")}</p>
          )}
          {phase === "wizard" && step === TRIAL_WIZARD_STEP_INDEX && !flagsLoaded && (
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">{t("onboardingSaving")}</p>
          )}
          {phase === "wizard" && step === CLARA_WIZARD_STEP_INDEX && (
            <StepClaraActivate
              onLinked={() => completeOnboarding({ claraActivation: "linked" })}
              onSkip={() => completeOnboarding({ claraActivation: "skipped" })}
              saving={saving}
            />
          )}
        </div>

        {phase === "wizard" && (
          <div className="flex items-center justify-between mt-4">
            {step > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setStep((s) => (s === CLARA_WIZARD_STEP_INDEX ? wizardBackFromClara(showTrialStep) : s - 1))
                }
                className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
              >
                &larr; Back
              </button>
            ) : (
              <span />
            )}
            {step < CLARA_WIZARD_STEP_INDEX ? (
              <button
                type="button"
                onClick={() => setStep(skipSetupTargetStep())}
                disabled={saving}
                className="text-sm text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                {t("onboardingSkipSetup")}
              </button>
            ) : (
              <span />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FeatureFlagProvider>
          <I18nProvider>
            <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
              <OnboardingContent />
              <footer className="py-6 text-center text-xs text-gray-400 dark:text-slate-500 flex items-center justify-center gap-3 flex-wrap">
                <span>&copy; {new Date().getFullYear()} trefolio</span>
                <span className="text-gray-300 dark:text-slate-700">&middot;</span>
                <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-slate-300 transition-colors">Privacy</Link>
                <span className="text-gray-300 dark:text-slate-700">&middot;</span>
                <Link href="/terms" className="hover:text-gray-600 dark:hover:text-slate-300 transition-colors">Terms</Link>
                <span className="text-gray-300 dark:text-slate-700">&middot;</span>
                <Link href="/contact" className="hover:text-gray-600 dark:hover:text-slate-300 transition-colors">Contact</Link>
              </footer>
            </div>
          </I18nProvider>
        </FeatureFlagProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
