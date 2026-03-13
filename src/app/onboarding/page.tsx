"use client";

import Link from "next/link";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { SUPPORTED_PORTFOLIO_CURRENCIES } from "@/lib/db/helpers";
import { COUNTRIES } from "@/lib/countries";
import { getBrokersForCountry } from "@/lib/country-brokers";

const TOTAL_STEPS = 3;

function StepIndicator({ current }: { current: number }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
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
        {t("onboardingStepOf").replace("{current}", String(current + 1)).replace("{total}", String(TOTAL_STEPS))}
      </span>
    </div>
  );
}

function StepProfile({
  displayName,
  setDisplayName,
  currency,
  setCurrency,
  onNext,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
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
      <button onClick={onNext} className="btn-primary w-full">
        {t("onboardingContinue")}
      </button>
    </div>
  );
}

function StepTaxResidency({
  selected,
  setSelected,
  onNext,
  onSkip,
}: {
  selected: string;
  setSelected: (v: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [search]);

  useEffect(() => {
    if (selected && listRef.current) {
      const el = listRef.current.querySelector(`[data-code="${selected}"]`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [selected]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-slate-400">{t("onboardingTaxResidencyHint")}</p>
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("onboardingSearchCountry")}
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 dark:placeholder:text-slate-500"
          autoFocus
        />
      </div>
      <div ref={listRef} className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-600 divide-y divide-gray-100 dark:divide-slate-700">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No results</p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.code}
              data-code={c.code}
              type="button"
              onClick={() => setSelected(c.code)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                selected === c.code
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50"
              }`}
            >
              <span className="text-lg leading-none">{c.flag}</span>
              <span className="flex-1">{c.name}</span>
              {selected === c.code && (
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
          ))
        )}
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
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{t(`onboardingImport_${opt.key}` as never)}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t(`onboardingImport_${opt.key}_desc` as never)}</p>
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
  skip: "/",
};

function OnboardingContent() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [taxResidency, setTaxResidency] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user?.displayName]);

  useEffect(() => {
    if (user?.onboardingCompleted) {
      router.replace("/");
    }
  }, [user?.onboardingCompleted, router]);

  const handleFinish = useCallback(async (importMethod?: ImportChoice) => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          defaultCurrency: currency,
          taxResidency: taxResidency || undefined,
          importMethod: importMethod || "skip",
        }),
      });
      if (res.ok) {
        await refreshUser();
        if (!importMethod || importMethod === "skip") {
          try { localStorage.setItem("trefolio_onboarding_auto_seeded", "1"); } catch { /* SSR safe */ }
        }
        const dest = importMethod ? IMPORT_REDIRECTS[importMethod] : "/";
        router.replace(dest);
      }
    } catch {
      // Allow retry
    }
    setSaving(false);
  }, [displayName, currency, taxResidency, refreshUser, router]);

  const stepTitles = [
    t("onboardingStep1Title"),
    t("onboardingStep2Title"),
    t("onboardingStep3ImportTitle"),
  ];

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
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
          <StepIndicator current={step} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{stepTitles[step]}</h2>

          {step === 0 && (
            <StepProfile
              displayName={displayName}
              setDisplayName={setDisplayName}
              currency={currency}
              setCurrency={setCurrency}
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <StepTaxResidency
              selected={taxResidency}
              setSelected={setTaxResidency}
              onNext={() => setStep(2)}
              onSkip={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepImport
              country={taxResidency}
              onFinish={handleFinish}
              saving={saving}
            />
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
            >
              &larr; Back
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() => handleFinish("skip")}
            disabled={saving}
            className="text-sm text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          >
            {t("onboardingSkipSetup")}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <ThemeProvider>
      <AuthProvider>
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
      </AuthProvider>
    </ThemeProvider>
  );
}
