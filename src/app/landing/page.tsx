"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import TierIcon from "@/components/TierIcon";
import PublicFooter from "@/components/PublicFooter";
import type { SubscriptionPlan } from "@/lib/types";
import { LandingI18nProvider, useI18n, type TranslationKey } from "@/lib/i18n";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { event as gtagEvent } from "@/lib/gtag";

/* ─── anonymous analytics helper ─── */

function trackLanding(event: string, metadata?: Record<string, string>) {
  fetch("/api/analytics/landing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, metadata }),
  }).catch(() => {});

  gtagEvent(event, metadata);
}

function useInViewOnce(callback: () => void) {
  const ref = useRef<HTMLElement | null>(null);
  const fired = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          callback();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [callback]);
  return ref;
}

/* ─── feature definitions (i18n) ─── */

type T = (key: TranslationKey) => string;

function getHeroFeatures(t: T) {
  return [
    {
      tag: t("landingFeaturePortfolioTag"),
      title: t("landingFeaturePortfolioTitle"),
      description: t("landingFeaturePortfolioDesc"),
      screenshot: "/screenshots/dashboard-overview.png",
      points: [
        t("landingFeaturePortfolioPoint1"),
        t("landingFeaturePortfolioPoint2"),
        t("landingFeaturePortfolioPoint3"),
        t("landingFeaturePortfolioPoint4"),
      ],
    },
    {
      tag: t("landingFeatureDividendsTag"),
      title: t("landingFeatureDividendsTitle"),
      description: t("landingFeatureDividendsDesc"),
      screenshot: "/screenshots/dividends.png",
      points: [
        t("landingFeatureDividendsPoint1"),
        t("landingFeatureDividendsPoint2"),
        t("landingFeatureDividendsPoint3"),
        t("landingFeatureDividendsPoint4"),
      ],
    },
    {
      tag: t("landingFeatureAiTag"),
      tagBadge: "Trefolio",
      title: t("landingFeatureAiTitle"),
      description: t("landingFeatureAiDesc"),
      screenshot: "/screenshots/holdings-table.png",
      points: [
        t("landingFeatureAiPoint1"),
        t("landingFeatureAiPoint2"),
        t("landingFeatureAiPoint3"),
        t("landingFeatureAiPoint4"),
      ],
    },
    {
      tag: t("landingFeatureImportTag"),
      title: t("landingFeatureImportTitle"),
      description: t("landingFeatureImportDesc"),
      screenshot: "/screenshots/tools-page.png",
      points: [
        t("landingFeatureImportPoint1"),
        t("landingFeatureImportPoint2"),
        t("landingFeatureImportPoint3"),
        t("landingFeatureImportPoint4"),
      ],
    },
  ];
}

function getFeatureCards(t: T) {
  return [
    { icon: "shield", title: t("landingCardTaxTitle"), desc: t("landingCardTaxDesc"), badge: "Pro" },
    { icon: "search", title: t("landingCardScreenerTitle"), desc: t("landingCardScreenerDesc"), badge: "Pro" },
    { icon: "wallet", title: t("landingCardNetWorthTitle"), desc: t("landingCardNetWorthDesc") },
    { icon: "sparkle", title: t("landingCardAiTitle"), desc: t("landingCardAiDesc") },
    { icon: "upload", title: t("landingCardImportTitle"), desc: t("landingCardImportDesc") },
    { icon: "chart", title: t("landingCardPerfTitle"), desc: t("landingCardPerfDesc") },
    { icon: "beaker", title: t("landingCardSimulatorTitle"), desc: t("landingCardSimulatorDesc"), badge: "Pro" },
    { icon: "calendar", title: t("landingCardEventsTitle"), desc: t("landingCardEventsDesc") },
    { icon: "globe", title: "35 Languages", desc: "The most multilingual portfolio tracker on the market. AI insights delivered in your native language.", badge: "#1" },
  ];
}

/* ─── pricing tiers ─── */

type BillingPeriod = "monthly" | "annual";

interface PricingTier {
  name: string;
  plan: SubscriptionPlan;
  regularMonthly: string;
  monthlyPrice: string;
  regularAnnualMonthly: string;
  annualMonthly: string;
  regularAnnual: string;
  annualPrice: string;
  annualSavePct: number;
  launchDiscountPct: number;
  isFree?: boolean;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const LAUNCH_DISCOUNT_PCT = 25;

function getPricing(t: T): PricingTier[] {
  return [
    {
      name: "Folio",
      plan: "free" as SubscriptionPlan,
      regularMonthly: "€0", monthlyPrice: "€0",
      regularAnnualMonthly: "€0", annualMonthly: "€0",
      regularAnnual: "€0", annualPrice: "€0",
      annualSavePct: 0, launchDiscountPct: 0, isFree: true,
      description: t("landingPricingFolioDesc"),
      features: Array.from({ length: 15 }, (_, i) => t(`landingPricingFolioFeature${i + 1}` as TranslationKey)),
      cta: t("landingPricingFolioCta"),
    },
    {
      name: "Bifolio",
      plan: "starter" as SubscriptionPlan,
      regularMonthly: "€3.99", monthlyPrice: "€2.99",
      regularAnnualMonthly: "€2.67", annualMonthly: "€2.00",
      regularAnnual: "€31.99", annualPrice: "€23.99",
      annualSavePct: 33, launchDiscountPct: 25,
      description: t("landingPricingBifolioDesc"),
      features: Array.from({ length: 13 }, (_, i) => t(`landingPricingBifolioFeature${i + 1}` as TranslationKey)),
      cta: t("landingPricingBifolioCta"),
      highlighted: false,
    },
    {
      name: "Trefolio",
      plan: "pro" as SubscriptionPlan,
      regularMonthly: "€9.99", monthlyPrice: "€7.99",
      regularAnnualMonthly: "€6.67", annualMonthly: "€5.00",
      regularAnnual: "€79.99", annualPrice: "€59.99",
      annualSavePct: 37, launchDiscountPct: 20,
      description: t("landingPricingTrefolioDesc"),
      features: Array.from({ length: 21 }, (_, i) => t(`landingPricingTrefolioFeature${i + 1}` as TranslationKey)),
      cta: t("landingPricingTrefolioCta"),
      highlighted: true,
    },
  ];
}

function getFaqItems(t: T) {
  return Array.from({ length: 8 }, (_, i) => ({
    q: t(`landingFaq${i + 1}Q` as TranslationKey),
    a: t(`landingFaq${i + 1}A` as TranslationKey),
  }));
}

function getTestimonials(t: T) {
  return [
    { quote: t("landingTestimonial1Quote"), name: t("landingTestimonial1Name"), role: t("landingTestimonial1Role") },
    { quote: t("landingTestimonial2Quote"), name: t("landingTestimonial2Name"), role: t("landingTestimonial2Role") },
    { quote: t("landingTestimonial3Quote"), name: t("landingTestimonial3Name"), role: t("landingTestimonial3Role") },
  ];
}

/* ─── icon components ─── */

function FeatureIcon({ type }: { type: string }) {
  const paths: Record<string, React.ReactNode> = {
    chart: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    ),
    currency: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    sparkle: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    ),
    upload: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    ),
    bell: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    ),
    shield: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    ),
    pie: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
    ),
    eye: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    globe: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />
    ),
    search: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    ),
    wallet: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    ),
    beaker: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M5 14.5l-1.047 2.094A1.125 1.125 0 005.004 18h13.992a1.125 1.125 0 001.05-1.406L19.8 15.3M5 14.5l14.8.8" />
    ),
  };

  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      {paths[type]}
    </svg>
  );
}

/* ─── logo component ─── */

function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={`${className} rounded-xl shadow-lg shadow-emerald-500/25`} viewBox="0 0 32 32">
      <defs>
        <linearGradient id="logo-a" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#6ee7b7"/><stop offset="100%" stopColor="#10b981"/></linearGradient>
        <linearGradient id="logo-b" x1="0" y1=".3" x2="1" y2=".7"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient>
        <linearGradient id="logo-c" x1=".5" y1="1" x2=".5" y2="0"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#047857"/></linearGradient>
        <linearGradient id="logo-d" x1="1" y1=".3" x2="0" y2=".7"><stop offset="0%" stopColor="#a7f3d0"/><stop offset="100%" stopColor="#34d399"/></linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="#0f172a"/>
      <g transform="translate(16,16) rotate(45)">
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#logo-a)"/>
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#logo-b)" transform="rotate(90)"/>
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#logo-c)" transform="rotate(180)"/>
        <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#logo-d)" transform="rotate(270)"/>
        <circle cx="0" cy="0" r="1.2" fill="#0f172a" opacity=".35"/>
      </g>
    </svg>
  );
}

/* ─── navbar ─── */

function LangPicker({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useI18n();
  return (
    <div className={`relative group ${className}`}>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Parameters<typeof setLanguage>[0])}
        aria-label="Select language"
        className="appearance-none bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700/50 hover:border-slate-600/60 text-slate-300 hover:text-white text-sm font-medium pl-8 pr-7 py-1.5 rounded-lg cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
            {lang.nativeName}
          </option>
        ))}
      </select>
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300 pointer-events-none transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 group-hover:text-slate-400 pointer-events-none transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </div>
  );
}

function NavBar() {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navLinks = useMemo(() => [
    { href: "#features", label: t("landingNavFeatures") },
    { href: "#pricing", label: t("landingNavPricing") },
    { href: "#faq", label: t("landingNavFaq") },
  ], [t]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      scrolled
        ? "bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/60 shadow-lg shadow-black/10"
        : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="w-9 h-9" />
          <span className="text-xl font-bold text-white tracking-tight">trefolio</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <LangPicker />
            <Link
              href="/login"
              onClick={() => trackLanding("landing_cta_click", { cta: "nav_login" })}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2"
            >
              {t("landingNavLogin")}
            </Link>
            <Link
              href="/signup"
              onClick={() => trackLanding("landing_cta_click", { cta: "nav_signup" })}
              className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30"
            >
              {t("landingNavSignUp")}
            </Link>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-slate-300 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-slate-950/98 backdrop-blur-xl border-t border-slate-800/50">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-slate-800/50 space-y-2">
              <LangPicker className="px-4 py-2" />
              <Link
                href="/login"
                className="block px-4 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                {t("landingNavLogin")}
              </Link>
              <Link
                href="/signup"
                className="block text-center bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-lg transition-all"
              >
                {t("landingNavSignUp")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── CSS mock dashboard for hero ─── */

function HeroDashboardMock() {
  return (
    <div className="relative max-w-5xl mx-auto">
      <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />
      <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/50 bg-slate-900 p-4 sm:p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {["Portfolio", "Dividends", "Metrics", "Events"].map((tab, i) => (
              <span key={tab} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${i === 0 ? "bg-emerald-500/15 text-emerald-400" : "text-slate-500 hover:text-slate-300"}`}>
                {tab}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-500">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </div>
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-500">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" /></svg>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">€47,284.50</span>
          <span className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md">+€1,247.30 (+2.71%)</span>
        </div>
        <div className="text-xs text-slate-500 mb-4">Total Value · 12 holdings · EUR</div>

        {/* Chart */}
        <div className="w-full h-20 sm:h-24 mb-4">
          <svg viewBox="0 0 500 100" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="hero-cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(16,185,129,0.3)" />
                <stop offset="100%" stopColor="rgba(16,185,129,0)" />
              </linearGradient>
            </defs>
            <path d="M0,80 C30,75 60,70 90,60 C120,50 150,55 180,45 C210,35 240,40 270,30 C300,20 330,25 360,18 C390,12 420,15 450,10 L500,8 L500,100 L0,100Z" fill="url(#hero-cg)" />
            <path d="M0,80 C30,75 60,70 90,60 C120,50 150,55 180,45 C210,35 240,40 270,30 C300,20 330,25 360,18 C390,12 420,15 450,10 L500,8" fill="none" stroke="#10b981" strokeWidth="2" />
          </svg>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          {[
            { label: "Day Gain", value: "+€347.20" },
            { label: "Total Gain", value: "+€8,241" },
            { label: "Dividends", value: "€1,420" },
          ].map((m) => (
            <div key={m.label} className="bg-white/[0.03] rounded-lg p-2.5 sm:p-3">
              <div className="text-[10px] text-slate-500 mb-0.5">{m.label}</div>
              <div className="text-sm font-bold text-emerald-400">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Holdings */}
        <div className="space-y-1">
          {[
            { ticker: "ASML", name: "ASML Holding", gain: "+18.42%", color: "#3b82f6", shares: "8 shares" },
            { ticker: "VWCE", name: "Vanguard FTSE All-World", gain: "+12.05%", color: "#10b981", shares: "42 shares" },
            { ticker: "AAPL", name: "Apple Inc.", gain: "+8.73%", color: "#f59e0b", shares: "15 shares" },
            { ticker: "BABA", name: "Alibaba Group", gain: "-4.21%", color: "#ef4444", shares: "20 shares", isLoss: true },
          ].map((h) => (
            <div key={h.ticker} className="flex items-center justify-between px-2.5 py-2 bg-white/[0.02] rounded-md text-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: h.color }} />
                <span className="font-semibold text-white">{h.ticker}</span>
                <span className="text-slate-500 hidden sm:inline">{h.shares}</span>
              </div>
              <span className={h.isLoss ? "text-red-400 font-semibold" : "text-emerald-400 font-semibold"}>{h.gain}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating AI card */}
      <div className="absolute -right-2 sm:-right-6 top-16 sm:top-20 w-48 sm:w-56 bg-slate-800/95 backdrop-blur-sm border border-slate-700/60 rounded-xl p-3 shadow-xl hidden md:block">
        <div className="text-[10px] font-semibold text-slate-400 mb-1.5">AI Portfolio Review</div>
        <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
          Your tech allocation is <span className="text-emerald-400 font-semibold">well-balanced</span>. Consider adding...
        </p>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
          Trefolio AI
        </span>
      </div>

      {/* Floating dividend card */}
      <div className="absolute -left-2 sm:-left-6 bottom-16 sm:bottom-20 w-40 sm:w-44 bg-slate-800/95 backdrop-blur-sm border border-slate-700/60 rounded-xl p-3 shadow-xl hidden md:block">
        <div className="text-[10px] font-semibold text-slate-400 mb-1">Next Dividend</div>
        <div className="text-lg font-extrabold text-emerald-400">€82.40</div>
        <div className="text-[10px] text-slate-500 mt-0.5">ASML · Ex-date Apr 28</div>
      </div>
    </div>
  );
}

/* ─── hero section ─── */

function HeroSection() {
  const { t } = useI18n();
  useEffect(() => { trackLanding("landing_page_view"); }, []);

  const valuePropItems = useMemo(() => [
    t("landingHeroVp1"), t("landingHeroVp2"), t("landingHeroVp3"),
  ], [t]);

  return (
    <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/2 w-[600px] h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-emerald-400">{t("landingHeroBadge")}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
            {t("landingHeroTitle")}{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              {t("landingHeroTitleAccent")}
            </span>
          </h1>

          <div className="flex flex-col items-center gap-3 mb-8">
            {valuePropItems.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-lg text-slate-300">{item}</span>
              </div>
            ))}
          </div>

          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            {t("landingHeroParagraph")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              href="/signup"
              onClick={() => trackLanding("landing_cta_click", { cta: "hero_signup" })}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all shadow-xl shadow-emerald-500/25 hover:shadow-emerald-400/30 hover:-translate-y-0.5"
            >
              {t("landingHeroCtaSignup")}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/demo"
              onClick={() => trackLanding("landing_cta_click", { cta: "hero_try_demo" })}
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white font-medium px-6 py-4 rounded-xl border border-slate-700 hover:border-slate-500 transition-all"
            >
              Try Interactive Demo
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-16 max-w-2xl mx-auto">
            {[
              { value: t("landingHeroProof1Value"), label: t("landingHeroProof1Label") },
              { value: t("landingHeroProof2Value"), label: t("landingHeroProof2Label") },
              { value: t("landingHeroProof3Value"), label: t("landingHeroProof3Label") },
              { value: t("landingHeroProof4Value"), label: t("landingHeroProof4Label") },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold text-white tracking-tight">{s.value}</div>
                <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <HeroDashboardMock />
      </div>
    </section>
  );
}

/* ─── stats bar ─── */

function StatsBar() {
  const { t } = useI18n();
  const stats = useMemo(() => [
    { value: t("landingStatRealtime"), label: t("landingStatLabelQuotes") },
    { value: t("landingStatExchanges"), label: t("landingStatLabelExchanges") },
    { value: t("landingStatAi"), label: t("landingStatLabelInsights") },
    { value: t("landingStatFree"), label: t("landingStatLabelStart") },
  ], [t]);

  return (
    <section className="py-10 border-y border-slate-800/50 bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── alternating features section ─── */

function FeaturesSection() {
  const { t } = useI18n();
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "features" }), []);
  const sectionRef = useInViewOnce(sectionCb);
  const heroFeatures = useMemo(() => getHeroFeatures(t), [t]);
  const featureCards = useMemo(() => getFeatureCards(t), [t]);

  return (
    <section id="features" className="py-20 sm:py-28" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t("landingFeaturesHeading")}{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {t("landingFeaturesHeadingAccent")}
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            {t("landingFeaturesSubtitle")}
          </p>
        </div>

        <div className="space-y-24">
          {heroFeatures.map((feature, i) => {
            const reversed = i % 2 === 1;
            return (
              <div
                key={feature.title}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
                  reversed ? "lg:direction-rtl" : ""
                }`}
              >
                {/* Text side */}
                <div className={`space-y-6 ${reversed ? "lg:order-2" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      {feature.tag}
                    </span>
                    {feature.tagBadge && (
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                        {feature.tagBadge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed text-lg">
                    {feature.description}
                  </p>
                  <ul className="space-y-3">
                    {feature.points.map((point) => (
                      <li key={point} className="flex items-center gap-3 text-sm">
                        <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-slate-300">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Screenshot side */}
                <div className={`relative ${reversed ? "lg:order-1" : ""}`}>
                  <div className="absolute -inset-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl blur-xl" />
                  <div className="relative rounded-xl overflow-hidden border border-slate-700/50 shadow-xl bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={feature.screenshot}
                      alt={feature.title}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-24">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-emerald-500/30 hover:bg-slate-800/50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <FeatureIcon type={card.icon} />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                {card.title}
                {"badge" in card && card.badge && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {card.badge}
                  </span>
                )}
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── testimonials / social proof ─── */

function TestimonialsSection() {
  const { t } = useI18n();
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "testimonials" }), []);
  const sectionRef = useInViewOnce(sectionCb);
  const testimonials = useMemo(() => getTestimonials(t), [t]);

  return (
    <section className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t("landingTestimonialsHeading")}{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {t("landingTestimonialsHeadingAccent")}
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            {t("landingTestimonialsSubtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((tm) => (
            <div
              key={tm.name}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 hover:border-slate-700 transition-colors"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 leading-relaxed mb-6 text-sm">&ldquo;{tm.quote}&rdquo;</p>
              <div>
                <div className="text-sm font-semibold text-white">{tm.name}</div>
                <div className="text-xs text-slate-500">{tm.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── mid-funnel CTA (exit ramp for high-intent users) ─── */

function MidFunnelCTA() {
  const { t } = useI18n();
  return (
    <div className="py-12 border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-lg text-slate-300 mb-6">{t("landingMidCtaText")}</p>
        <Link
          href="/signup"
          onClick={() => trackLanding("landing_cta_click", { cta: "mid_funnel_signup" })}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 hover:-translate-y-0.5"
        >
          {t("landingMidCtaButton")}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/* ─── why trefolio (positive comparison) ─── */

function WhySection() {
  const { t } = useI18n();
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "why" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  const comparisons = useMemo(() => [
    { feature: t("landingWhyRow1"), us: true, others: false, spreadsheets: false, exclusive: true },
    { feature: t("landingWhyRow2"), us: true, others: false, spreadsheets: false, exclusive: true },
    { feature: t("landingWhyRow3"), us: true, others: false, spreadsheets: false, exclusive: true },
    { feature: t("landingWhyRow4"), us: true, others: false, spreadsheets: false, exclusive: true },
    { feature: t("landingWhyRow5"), us: true, others: false, spreadsheets: false, exclusive: true },
    { feature: t("landingWhyRow6"), us: true, others: false, spreadsheets: false, exclusive: true },
    { feature: t("landingWhyRow7"), us: true, others: false, spreadsheets: true },
    { feature: t("landingWhyRow8"), us: true, others: true, spreadsheets: false },
    { feature: t("landingWhyRow9"), us: true, others: true, spreadsheets: false },
    { feature: t("landingWhyRow10" as TranslationKey), us: true, others: true, spreadsheets: false },
    { feature: t("landingWhyRow11" as TranslationKey), us: true, others: true, spreadsheets: false },
    { feature: t("landingWhyRow12" as TranslationKey), us: true, others: false, spreadsheets: false },
    { feature: t("landingWhyRow13" as TranslationKey), us: true, others: false, spreadsheets: true },
    { feature: t("landingWhyRow14" as TranslationKey), us: true, others: false, spreadsheets: false, exclusive: true },
    { feature: t("landingWhyRow15" as TranslationKey), us: true, others: true, spreadsheets: false },
    { feature: t("landingWhyRow16" as TranslationKey), us: true, others: false, spreadsheets: false },
  ], [t]);

  const Check = () => (
    <svg className="w-5 h-5 text-emerald-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );

  const Cross = () => (
    <svg className="w-5 h-5 text-slate-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <section className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Feature by feature
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 mt-4">
            {t("landingWhyHeading")}{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {t("landingWhyHeadingAccent")}
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            {t("landingWhySubtitle")}
          </p>
        </div>

        <div className="max-w-3xl mx-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-4 text-slate-400 font-medium">{t("landingWhyColFeature")}</th>
                <th className="text-center px-4 py-4 text-emerald-400 font-semibold">{t("landingWhyColUs")}</th>
                <th className="text-center px-4 py-4 text-slate-400 font-medium">{t("landingWhyColOthers")}</th>
                <th className="text-center px-4 py-4 text-slate-400 font-medium">{t("landingWhyColSheets")}</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row) => (
                <tr key={row.feature} className="border-b border-slate-800/50">
                  <td className={`px-4 py-3.5 ${row.exclusive ? "text-white font-semibold" : "text-slate-300"}`}>{row.feature}</td>
                  <td className="px-4 py-3.5">{row.us ? <Check /> : <Cross />}</td>
                  <td className="px-4 py-3.5">{row.others ? <Check /> : <Cross />}</td>
                  <td className="px-4 py-3.5">{row.spreadsheets ? <Check /> : <Cross />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-center text-xs text-slate-500 mt-6">
            <span className="text-emerald-400 font-semibold">Bold rows</span> = features exclusive to trefolio or where trefolio significantly leads the market.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── video section ─── */

function VideoTutorialSection() {
  const { t } = useI18n();
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "video" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t("landingVideoHeading")}{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">{t("landingVideoHeadingAccent")}</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            {t("landingVideoSubtitle")}
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/50 bg-slate-900">
            <video
              className="w-full h-auto"
              controls
              preload="metadata"
              poster="/videos/upload-preview.png"
            >
              <source src="/videos/how-to-upload.webm" type="video/webm" />
              <source src="/videos/promo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
          {[
            { step: "1", title: t("landingVideoStep1Title"), desc: t("landingVideoStep1Desc") },
            { step: "2", title: t("landingVideoStep2Title"), desc: t("landingVideoStep2Desc") },
            { step: "3", title: t("landingVideoStep3Title"), desc: t("landingVideoStep3Desc") },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-lg shrink-0">
                {s.step}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">{s.title}</h4>
                <p className="text-sm text-slate-400">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── install app section ─── */

function InstallAppSection() {
  const { t } = useI18n();
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "install_app" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  const points = useMemo(() => [
    t("landingInstallPoint1" as TranslationKey),
    t("landingInstallPoint2" as TranslationKey),
    t("landingInstallPoint3" as TranslationKey),
    t("landingInstallPoint4" as TranslationKey),
  ], [t]);

  return (
    <section className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Screenshot side */}
          <div className="relative flex justify-center">
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl blur-xl" />
            <div className="relative w-[280px] sm:w-[320px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/screenshots/pwa-homescreen.png"
                alt={t("landingInstallScreenshotAlt" as TranslationKey)}
                className="w-full h-auto drop-shadow-2xl rounded-[2rem]"
                loading="lazy"
              />
            </div>
          </div>

          {/* Text side */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                PWA
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
              {t("landingInstallHeading")}{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                {t("landingInstallHeadingAccent")}
              </span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed">
              {t("landingInstallSubtitle")}
            </p>
            <ul className="space-y-3">
              {points.map((point) => (
                <li key={point} className="flex items-center gap-3 text-sm">
                  <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── device promotion section (gated by device_enabled flag) ─── */

function DeviceSection() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [enrollError, setEnrollError] = useState("");
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "device" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  useEffect(() => {
    fetch("/api/feature-flags")
      .then((r) => r.json())
      .then((flags) => { if (flags.device_enabled) setVisible(true); })
      .catch(() => {});
  }, []);

  const handleEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError("");
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEnrollError(t("landingDeviceEmailError"));
      return;
    }
    try {
      sessionStorage.setItem("device_interest_pending", "1");
    } catch { /* private browsing */ }
    trackLanding("landing_cta_click", { cta: "device_notify" });
    window.location.href = `/signup?email=${encodeURIComponent(trimmed)}&ref=device`;
  };

  if (!visible) return null;

  const highlights = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
        </svg>
      ),
      title: t("landingDeviceAmoledTitle"),
      desc: t("landingDeviceAmoledDesc"),
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      title: t("landingDeviceLiveTitle"),
      desc: t("landingDeviceLiveDesc"),
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      ),
      title: t("landingDeviceAiTitle"),
      desc: t("landingDeviceAiDesc"),
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
      ),
      title: t("landingDeviceOtaTitle"),
      desc: t("landingDeviceOtaDesc"),
    },
  ];

  return (
    <section className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image side */}
          <div className="relative flex justify-center">
            <div className="absolute -inset-8 bg-gradient-to-br from-violet-500/15 via-emerald-500/10 to-cyan-500/15 rounded-3xl blur-3xl" />
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/screenshots/device-t4s3.png"
                alt={t("landingDeviceImgAlt")}
                className="w-full max-w-md h-auto drop-shadow-2xl"
                loading="lazy"
              />
            </div>
          </div>

          {/* Text side */}
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                  {t("landingDeviceBadgeHardware")}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  {t("landingDeviceBadgeComingSoon")}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
                {t("landingDeviceHeading")}{" "}
                <span className="bg-gradient-to-r from-violet-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  {t("landingDeviceHeadingAccent")}
                </span>
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                {t("landingDeviceDesc")}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {highlights.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-0.5">{item.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleEnroll} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEnrollError(""); }}
                placeholder={t("landingDeviceEmailPlaceholder")}
                className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm"
                required
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-violet-600/25 hover:shadow-violet-500/30 text-sm whitespace-nowrap"
              >
                {t("landingDeviceCtaNotify")}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </form>
            {enrollError && (
              <p className="text-xs text-red-400 mt-1">{enrollError}</p>
            )}

            <p className="text-xs text-slate-500">
              {t("landingDeviceDisclaimer")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── themes showcase ─── */

function ThemesShowcase() {
  const { t } = useI18n();
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "themes" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  const themes = useMemo(() => [
    {
      name: t("landingThemeDefaultName"),
      desc: t("landingThemeDefaultDesc"),
      tier: t("landingThemeDefaultTier"),
      tierClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      bg: "bg-slate-900", text: "text-white", accent: "#10b981", muted: "text-slate-400",
      valueBg: "bg-slate-800/50",
    },
    {
      name: t("landingThemeCanvasName"),
      desc: t("landingThemeCanvasDesc"),
      tier: t("landingThemeCanvasTier"),
      tierClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      bg: "bg-[#f8f5f0]", text: "text-[#1a1a1a]", accent: "#16a34a", muted: "text-[#7a7a6a]",
      valueBg: "bg-white/80",
    },
    {
      name: t("landingThemeTerminalName"),
      desc: t("landingThemeTerminalDesc"),
      tier: t("landingThemeTerminalTier"),
      tierClass: "text-violet-400 bg-violet-500/10 border-violet-500/20",
      bg: "bg-[#09090b]", text: "text-[#22c55e]", accent: "#22c55e", muted: "text-[#52525b]",
      valueBg: "bg-[#18181b]",
    },
    {
      name: t("landingThemeStudioName"),
      desc: t("landingThemeStudioDesc"),
      tier: t("landingThemeStudioTier"),
      tierClass: "text-violet-400 bg-violet-500/10 border-violet-500/20",
      bg: "bg-[#0c0c0c]", text: "text-white", accent: "#22c55e", muted: "text-[#525252]",
      valueBg: "bg-[#1a1a1a]",
    },
  ], [t]);

  return (
    <section id="themes" className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            {t("landingThemesEyebrow")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 mt-4">
            {t("landingThemesHeading")}{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {t("landingThemesHeadingAccent")}
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            {t("landingThemesSubtitle")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {themes.map((theme) => (
            <div
              key={theme.name}
              className={`${theme.bg} rounded-2xl border border-slate-700/40 p-5 shadow-lg`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`font-bold text-sm ${theme.text}`}>{theme.name}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${theme.tierClass}`}>
                  {theme.tier}
                </span>
              </div>
              <div className={`text-xs ${theme.muted} mb-3`}>{theme.desc}</div>
              <div className={`text-xl font-extrabold tracking-tight ${theme.text}`}>€47,284</div>
              <div className="text-xs font-semibold mt-0.5 mb-3" style={{ color: theme.accent }}>+2.71%</div>
              <div className="space-y-1">
                {["ASML", "VWCE", "AAPL"].map((ticker) => (
                  <div key={ticker} className={`flex items-center justify-between ${theme.valueBg} rounded-md px-2 py-1.5 text-[11px]`}>
                    <span className={`font-semibold ${theme.text}`}>{ticker}</span>
                    <span style={{ color: theme.accent }} className="font-semibold">+18.42%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── value proposition ─── */

function ValuePropsSection() {
  const { t } = useI18n();
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "value_props" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  const values = useMemo(() => [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />
        </svg>
      ),
      value: t("landingValue1Value"), label: t("landingValue1Label"), desc: t("landingValue1Desc"),
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      ),
      value: t("landingValue2Value"), label: t("landingValue2Label"), desc: t("landingValue2Desc"),
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      ),
      value: t("landingValue3Value"), label: t("landingValue3Label"), desc: t("landingValue3Desc"),
      badge: t("landingValue3Badge"), highlighted: true,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      value: t("landingValue4Value"), label: t("landingValue4Label"), desc: t("landingValue4Desc"),
    },
  ], [t]);

  return (
    <section className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            {t("landingValueEyebrow")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 mt-4">
            {t("landingValueHeading")}{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {t("landingValueHeadingAccent")}
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            {t("landingValueSubtitle")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {values.map((v) => (
            <div
              key={v.label}
              className={`relative rounded-2xl p-7 text-center ${
                v.highlighted
                  ? "bg-slate-900/50 border-2 border-emerald-500/40"
                  : "bg-slate-900/50 border border-slate-800"
              }`}
            >
              {v.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-emerald-500 px-3 py-1 rounded-full">
                  {v.badge}
                </div>
              )}
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-emerald-400">
                {v.icon}
              </div>
              <div className="text-4xl font-extrabold text-white tracking-tight mb-1">
                {v.value}{v.highlighted && <span className="text-base font-medium text-slate-400">/mo</span>}
              </div>
              <div className="text-sm font-semibold text-slate-300 mb-1">{v.label}</div>
              <div className="text-xs text-slate-500">{v.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── trust & privacy ─── */

function TrustSection() {
  const { t } = useI18n();
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "trust" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  const cards = useMemo(() => [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      iconClass: "bg-emerald-500/10 text-emerald-400",
      title: t("landingTrust1Title"), desc: t("landingTrust1Desc"),
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
      iconClass: "bg-cyan-500/10 text-cyan-400",
      title: t("landingTrust2Title"), desc: t("landingTrust2Desc"),
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      ),
      iconClass: "bg-violet-500/10 text-violet-400",
      title: t("landingTrust3Title"), desc: t("landingTrust3Desc"),
    },
  ], [t]);

  return (
    <section className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            {t("landingTrustEyebrow")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 mt-4">
            {t("landingTrustHeading")}{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {t("landingTrustHeadingAccent")}
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            {t("landingTrustSubtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {cards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center hover:border-slate-700 transition-colors">
              <div className={`w-14 h-14 rounded-xl ${card.iconClass} flex items-center justify-center mx-auto mb-5`}>
                {card.icon}
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">{card.title}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── getting started steps ─── */

function GettingStartedSection() {
  const { t } = useI18n();
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "getting_started" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            {t("landingGsEyebrow")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 mt-4">
            {t("landingGsHeading")}{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {t("landingGsHeadingAccent")}
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            {t("landingGsSubtitle")}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {[
            { step: "1", title: t("landingGs1Title"), desc: t("landingGs1Desc") },
            { step: "2", title: t("landingGs2Title"), desc: t("landingGs2Desc") },
            { step: "3", title: t("landingGs3Title"), desc: t("landingGs3Desc") },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xl mx-auto mb-4">
                {s.step}
              </div>
              <h4 className="text-base font-semibold text-white mb-2">{s.title}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ section ─── */

function FAQSection() {
  const { t } = useI18n();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "faq" }), []);
  const sectionRef = useInViewOnce(sectionCb);
  const faqItems = useMemo(() => getFaqItems(t), [t]);

  return (
    <section id="faq" className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t("landingFaqHeading")}{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">{t("landingFaqHeadingAccent")}</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            {t("landingFaqSubtitle")}
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqItems.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className={`rounded-2xl border transition-all ${
                  isOpen
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                }`}
              >
                <button
                  onClick={() => {
                    setOpenIdx(isOpen ? null : i);
                    if (!isOpen) trackLanding("landing_faq_open", { question: item.q });
                  }}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="text-sm sm:text-base font-medium text-white pr-4">{item.q}</span>
                  <svg
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-slate-400 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── billing toggle ─── */

function BillingToggle({
  period,
  onChange,
}: {
  period: BillingPeriod;
  onChange: (p: BillingPeriod) => void;
}) {
  const { t } = useI18n();
  const isAnnual = period === "annual";
  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className={`text-sm font-medium transition-colors cursor-pointer ${
          !isAnnual ? "text-white" : "text-slate-400"
        }`}
        onClick={() => onChange("monthly")}
      >
        {t("landingPricingToggleMonthly")}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isAnnual}
        aria-label="Toggle annual billing"
        onClick={() => onChange(isAnnual ? "monthly" : "annual")}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          isAnnual ? "bg-emerald-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            isAnnual ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span
        className={`flex items-center gap-2 cursor-pointer transition-colors ${
          isAnnual ? "text-white" : "text-slate-400"
        }`}
        onClick={() => onChange("annual")}
      >
        <span className="text-sm font-medium">{t("landingPricingToggleAnnually")}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border transition-colors ${
          isAnnual
            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            : "text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse"
        }`}>
          {t("landingPricingSavePct")}
        </span>
      </span>
    </div>
  );
}

/* ─── pricing section ─── */

function PricingSection() {
  const { t } = useI18n();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const sectionCb = useCallback(() => trackLanding("landing_pricing_view"), []);
  const sectionRef = useInViewOnce(sectionCb);
  const isAnnual = billingPeriod === "annual";
  const pricing = useMemo(() => getPricing(t), [t]);

  return (
    <section id="pricing" className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t("landingPricingHeading")}{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">{t("landingPricingHeadingAccent")}</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            {t("landingPricingSubtitle")}
          </p>
          <div className="inline-flex items-center gap-2 mt-4 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="text-sm font-semibold text-amber-400">{t("landingPricingLaunchBadge")} &mdash; {t("landingPricingLaunchBadgeUpTo")} {LAUNCH_DISCOUNT_PCT}% {t("landingPricingLaunchBadgeDetail")}</span>
          </div>
        </div>

        <div className="mb-12">
          <BillingToggle period={billingPeriod} onChange={(p) => {
            setBillingPeriod(p);
            trackLanding("landing_pricing_toggle", { period: p });
          }} />
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricing.map((tier) => {
            const displayPrice = tier.isFree
              ? "€0"
              : isAnnual
                ? tier.annualMonthly
                : tier.monthlyPrice;
            const regularPrice = isAnnual
              ? tier.regularAnnualMonthly
              : tier.regularMonthly;
            const displayPeriod = tier.isFree
              ? "forever"
              : "/month";

            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-8 ${
                  tier.highlighted
                    ? "bg-gradient-to-b from-emerald-500/10 to-transparent border-2 border-emerald-500/40 shadow-xl shadow-emerald-500/10"
                    : "border border-slate-800 bg-slate-900/50"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/25">
                    {t("landingPricingMostPopular")}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <TierIcon plan={tier.plan} size={22} className="text-emerald-400" />
                    {tier.name}
                    {!tier.isFree && tier.launchDiscountPct > 0 && (
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        -{tier.launchDiscountPct}%
                      </span>
                    )}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    {!tier.isFree && (
                      <span className="text-lg text-slate-500 line-through">{regularPrice}</span>
                    )}
                    <span className="text-4xl font-extrabold text-white">{displayPrice}</span>
                    <span className="text-slate-400">{displayPeriod}</span>
                  </div>
                  {!tier.isFree && isAnnual && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-sm text-slate-500 line-through">{tier.regularAnnual}/yr</span>
                      <span className="text-sm text-slate-400">
                        {tier.annualPrice}/year
                      </span>
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Save {tier.annualSavePct}%
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-slate-400 mt-2">{tier.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <svg className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  onClick={() => trackLanding("landing_cta_click", { cta: `pricing_${tier.name.toLowerCase()}`, period: billingPeriod })}
                  className={`block text-center font-semibold py-3.5 rounded-xl transition-all ${
                    tier.highlighted
                      ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25"
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          {t("landingPricingFooter")}
        </p>
      </div>
    </section>
  );
}

/* ─── CTA section ─── */

function CTASection() {
  const { t } = useI18n();
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "cta" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section className="py-20 sm:py-28" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />

          <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t("landingCtaHeading")}
            </h2>
            <p className="text-lg text-emerald-100 max-w-xl mx-auto mb-8">
              {t("landingCtaParagraph")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                onClick={() => trackLanding("landing_cta_click", { cta: "footer_signup" })}
                className="inline-flex items-center gap-2 bg-white text-emerald-700 font-semibold px-8 py-4 rounded-xl text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
              >
                {t("landingCtaSignup")}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/login"
                onClick={() => trackLanding("landing_cta_click", { cta: "footer_login" })}
                className="text-emerald-100 hover:text-white font-medium transition-colors"
              >
                {t("landingCtaLogin")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── footer (shared component) ─── */

/* ─── page ─── */

function NativeRedirect() {
  useEffect(() => {
    const cap = (window as unknown as Record<string, unknown>).Capacitor as
      | { isNativePlatform?: () => boolean }
      | undefined;
    if (cap?.isNativePlatform?.()) {
      window.location.replace("/login");
    }
  }, []);
  return null;
}

export default function LandingPage() {
  return (
    <LandingI18nProvider>
    <NativeRedirect />
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NavBar />
      <HeroSection />
      <StatsBar />
      <FeaturesSection />
      <ThemesShowcase />
      <ValuePropsSection />
      <WhySection />
      <TestimonialsSection />
      <TrustSection />
      <MidFunnelCTA />
      <PricingSection />
      <FAQSection />
      <GettingStartedSection />
      <VideoTutorialSection />
      <InstallAppSection />
      <DeviceSection />
      <CTASection />
      <PublicFooter />
    </div>
    </LandingI18nProvider>
  );
}
