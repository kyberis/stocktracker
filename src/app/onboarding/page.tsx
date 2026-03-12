"use client";

import Link from "next/link";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { SUPPORTED_PORTFOLIO_CURRENCIES } from "@/lib/db/helpers";
import { COUNTRIES } from "@/lib/countries";

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

function StepSecurity({ onFinish, saving }: { onFinish: () => void; saving: boolean }) {
  const { t } = useI18n();
  const { user, refreshUser } = useAuth();
  const [passkeyDone, setPasskeyDone] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState("");
  const [supportsPasskey, setSupportsPasskey] = useState(false);

  useEffect(() => {
    setSupportsPasskey(browserSupportsWebAuthn());
  }, []);

  const googleLinked = user?.googleLinked || user?.authProvider === "google";
  const showGoogle = user?.authProvider !== "google" && !googleLinked;

  const handlePasskey = useCallback(async () => {
    setPasskeyLoading(true);
    setPasskeyError("");
    try {
      const optRes = await fetch("/api/auth/passkey/register-options", { method: "POST" });
      if (!optRes.ok) throw new Error("Failed to get options");
      const options = await optRes.json();
      const credential = await startRegistration(options);
      const verifyRes = await fetch("/api/auth/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => null);
        setPasskeyError(data?.error || "Failed to create passkey");
      } else {
        setPasskeyDone(true);
        await refreshUser();
      }
    } catch {
      setPasskeyError("Failed to create passkey");
    }
    setPasskeyLoading(false);
  }, [refreshUser]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-slate-400">{t("onboardingSecurityHint")}</p>

      {/* Passkey */}
      {supportsPasskey && (
        <div className="rounded-xl border border-gray-200 dark:border-slate-600 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.488 8.673M11.998 3a8.96 8.96 0 00-3.269.617M15.75 10.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t("onboardingCreatePasskey")}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t("onboardingPasskeyHint")}</p>
            </div>
          </div>
          {passkeyDone ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t("onboardingPasskeyCreated")}
            </div>
          ) : (
            <>
              {passkeyError && <p className="mt-2 text-xs text-red-500">{passkeyError}</p>}
              <button
                onClick={handlePasskey}
                disabled={passkeyLoading}
                className="mt-3 w-full text-sm font-medium px-4 py-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
              >
                {passkeyLoading ? "Creating\u2026" : t("onboardingCreatePasskey")}
              </button>
            </>
          )}
        </div>
      )}

      {/* Google */}
      {showGoogle && (
        <div className="rounded-xl border border-gray-200 dark:border-slate-600 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t("onboardingConnectGoogle")}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t("onboardingGoogleHint")}</p>
            </div>
          </div>
          {googleLinked ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t("onboardingGoogleConnected")}
            </div>
          ) : (
            <a
              href="/api/auth/google"
              className="mt-3 w-full text-sm font-medium px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-2"
            >
              {t("onboardingConnectGoogle")}
            </a>
          )}
        </div>
      )}

      <button onClick={onFinish} disabled={saving} className="btn-primary w-full">
        {saving ? "Saving\u2026" : t("onboardingFinish")}
      </button>
    </div>
  );
}

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

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, defaultCurrency: currency, taxResidency: taxResidency || undefined }),
      });
      if (res.ok) {
        await refreshUser();
        router.replace("/");
      }
    } catch {
      // Allow retry
    }
    setSaving(false);
  }, [displayName, currency, taxResidency, refreshUser, router]);

  const stepTitles = [
    t("onboardingStep1Title"),
    t("onboardingStep2Title"),
    t("onboardingStep3Title"),
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
            <StepSecurity onFinish={handleFinish} saving={saving} />
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
            onClick={handleFinish}
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
