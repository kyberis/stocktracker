"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

/* ─── anonymous analytics helper ─── */

function trackLanding(event: string, metadata?: Record<string, string>) {
  fetch("/api/analytics/landing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, metadata }),
  }).catch(() => {});
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

/* ─── feature definitions ─── */

interface Feature {
  title: string;
  description: string;
  screenshot: string;
  badge?: string;
}

const FEATURES: Feature[] = [
  {
    title: "Real-Time Portfolio Dashboard",
    description:
      "Clean, broker-style portfolio view — see your total value and daily change at a glance, with per-stock EUR values, exchange info, and price breakdowns. Multi-exchange support for NYSE, XETRA, LSE, MAD, and more.",
    screenshot: "/screenshots/dashboard-overview.png",
  },
  {
    title: "Dividend Tracking & Projections",
    description:
      "Track estimated annual income, dividend yield, and per-stock breakdowns. Visualize yearly history and project future growth.",
    screenshot: "/screenshots/dividends.png",
  },
  {
    title: "Transaction History & CSV Import",
    description:
      "Import your portfolio from DEGIRO or a simple CSV file in seconds. Buys, sells, dividends, and fees are parsed automatically with manual format selection.",
    screenshot: "/screenshots/tools-page.png",
  },
  {
    title: "Portfolio Growth Projection",
    description:
      "Model your portfolio's future with adjustable growth rates, dividend reinvestment, and yearly contributions over 10–30 year horizons.",
    screenshot: "/screenshots/dashboard-overview.png",
  },
  {
    title: "Economic Indicators Dashboard",
    description:
      "Track GDP, inflation, treasury yields, employment, and more. Powered by Alpha Vantage with interactive charts and historical data.",
    screenshot: "/screenshots/pro-upgrade.png",
    badge: "Pro",
  },
  {
    title: "AI-Powered Insights",
    description:
      "Get plain-language explanations of your stock fundamentals, market news sentiment, insider trades, and institutional holdings.",
    screenshot: "/screenshots/holdings-table.png",
    badge: "Pro",
  },
  {
    title: "Price Alerts",
    description:
      "Set price alerts for any stock — get notified instantly when a stock crosses your target price. Free users get 2 alerts, Pro users get unlimited with email delivery.",
    screenshot: "/screenshots/dashboard-overview.png",
  },
];

/* ─── pricing tiers ─── */

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const PRICING: PricingTier[] = [
  {
    name: "Free",
    price: "€0",
    period: "forever",
    description: "Everything you need to start tracking your investments.",
    features: [
      "Unlimited stocks & ETFs",
      "Real-time Yahoo Finance quotes",
      "Historical price charts",
      "Cash balance tracking",
      "Benchmark comparison (S&P 500, etc.)",
      "DEGIRO & Simple CSV import",
      "Dark & light mode",
      "English + Spanish",
      "5 AI analysis calls/month",
      "2 price alerts (in-app)",
    ],
    cta: "Get Started Free",
  },
  {
    name: "Pro",
    price: "€2",
    period: "/month",
    description: "Advanced insights for serious portfolio management.",
    features: [
      "Everything in Free, plus:",
      "Unlimited AI analysis",
      "Company fundamentals (income, balance, cash flow)",
      "Stock intelligence (news sentiment, insider trades)",
      "Institutional holdings data",
      "Economic indicators dashboard",
      "Alpha Vantage premium data",
      "Unlimited price alerts + email delivery",
      "Priority support",
      "Export to CSV",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
];

/* ─── competitor comparison ─── */

const COMPETITORS = [
  { name: "Yahoo Finance", price: "Free", weakness: "No AI, cluttered UI, no multi-currency portfolio" },
  { name: "Seeking Alpha", price: "$19.99/mo", weakness: "Expensive, US-focused, complex" },
  { name: "Simply Wall St", price: "$10/mo", weakness: "Expensive for casual investors" },
  { name: "Portfolio Performance", price: "Free", weakness: "Desktop only, no AI, steep learning curve" },
];

/* ─── stat highlights ─── */

const STATS = [
  { value: "5+", label: "Stock Exchanges" },
  { value: "2", label: "Languages" },
  { value: "€2/mo", label: "Pro Price" },
  { value: "25+", label: "Features" },
];

/* ─── logo component ─── */

function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`${className} rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25`}>
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    </div>
  );
}

/* ─── section components ─── */

function NavBar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-xl font-bold text-white tracking-tight">StockTracker</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            onClick={() => trackLanding("landing_cta_click", { cta: "nav_login" })}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            onClick={() => trackLanding("landing_cta_click", { cta: "nav_signup" })}
            className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30"
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  useEffect(() => {
    trackLanding("landing_page_view");
  }, []);

  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      {/* gradient mesh background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/2 w-[600px] h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium text-emerald-400">Now with AI-powered insights</span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
          Track Your Portfolio
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
            With Clarity
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          The simplest way to manage your stock portfolio. Real-time quotes, dividend tracking,
          growth projections, and AI analysis — for just €2/month.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/signup"
            onClick={() => trackLanding("landing_cta_click", { cta: "hero_signup" })}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all shadow-xl shadow-emerald-500/25 hover:shadow-emerald-400/30 hover:-translate-y-0.5"
          >
            Get Started Free
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <a
            href="#features"
            onClick={() => trackLanding("landing_cta_click", { cta: "hero_see_features" })}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white font-medium px-6 py-4 rounded-xl transition-colors"
          >
            See Features
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>

        {/* Hero screenshot */}
        <div className="relative max-w-5xl mx-auto">
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/screenshots/dashboard-overview.png"
              alt="StockTracker Dashboard showing portfolio summary, performance metrics, and growth projection"
              className="w-full h-auto"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  return (
    <section className="py-12 border-y border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = FEATURES[activeIdx];
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "features" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section id="features" className="py-24 sm:py-32" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything You Need to Invest{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Confidently</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            From real-time tracking to AI-powered analysis — built for European retail investors who want clarity, not complexity.
          </p>
        </div>

        {/* feature selector tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {FEATURES.map((f, i) => (
            <button
              key={f.title}
              onClick={() => {
                setActiveIdx(i);
                trackLanding("landing_feature_tab", { feature: f.title });
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                i === activeIdx
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700"
              }`}
            >
              {f.badge && (
                <span className="inline-block bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded mr-1.5 uppercase">
                  {f.badge}
                </span>
              )}
              {f.title}
            </button>
          ))}
        </div>

        {/* active feature detail */}
        <div className="grid lg:grid-cols-5 gap-8 items-center">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-2xl font-bold text-white">{active.title}</h3>
            {active.badge && (
              <span className="inline-block bg-emerald-500/15 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                {active.badge} Feature
              </span>
            )}
            <p className="text-slate-400 leading-relaxed text-lg">{active.description}</p>
          </div>
          <div className="lg:col-span-3 relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl blur-xl" />
            <div className="relative rounded-xl overflow-hidden border border-slate-700/50 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.screenshot}
                alt={active.title}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        {/* feature grid cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-20">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              ),
              title: "Performance Metrics",
              desc: "TTWROR and IRR calculations with methodology explanations",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              title: "Multi-Currency",
              desc: "Automatic EUR/USD/GBP conversion across all exchanges",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              ),
              title: "AI Analysis",
              desc: "Plain-language insights on stocks, news, and indicators",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              ),
              title: "CSV Import",
              desc: "DEGIRO and Simple CSV import with full transaction parsing",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                </svg>
              ),
              title: "Bilingual",
              desc: "Full English and Spanish support across the entire app",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
              title: "Privacy First",
              desc: "Self-hostable, encrypted at rest, no selling of your data",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-emerald-500/30 hover:bg-slate-800/50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
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

/* ─── FAQ data ─── */

const FAQ_ITEMS = [
  {
    q: "How do I import my portfolio?",
    a: "Go to your Dashboard and click the upload icon in the header. Choose your format (DeGiro or Simple CSV), drag & drop your file, review the parsed transactions, and click Import All. Your holdings will appear on the dashboard immediately.",
  },
  {
    q: "What CSV formats are supported?",
    a: "Two formats: (1) DeGiro Account.csv — exported from DEGIRO's Activity > Account > Export. (2) Simple CSV — a file with columns: ticker, type (buy/sell/dividend/fee), price, amount, currency. You can optionally include date and name columns.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted at rest, passwords are hashed with bcrypt, and sessions use secure HTTP-only cookies. StockTracker is also fully self-hostable if you want complete control.",
  },
  {
    q: "What exchanges are supported?",
    a: "StockTracker supports NYSE, NASDAQ, XETRA, LSE, Amsterdam (AMS), Madrid (MAD), Copenhagen (OMK), and more. Multi-currency conversion between EUR, USD, GBP, DKK, and CAD is handled automatically.",
  },
  {
    q: "How are performance metrics calculated?",
    a: "TTWROR uses the Modified Dietz method, which weights each cash flow by the fraction of the period remaining — so returns reflect market performance only, not deposit timing. IRR (XIRR) finds the annualized rate that makes the net present value of all dated cash flows equal zero.",
  },
  {
    q: "What's the difference between Free and Pro?",
    a: "Free includes unlimited holdings, real-time quotes, charts, broker import, and 5 AI calls/month. Pro (€2/month) adds unlimited AI analysis, company fundamentals, stock intelligence, economic indicators, and Alpha Vantage premium data.",
  },
  {
    q: "Can I cancel Pro anytime?",
    a: "Yes. Pro is billed monthly (€2) or annually (€20/year, save 17%). You can cancel anytime from the billing portal — your Pro features remain active until the end of the billing period.",
  },
  {
    q: "How do dividends and fees get tracked?",
    a: "When you import a DeGiro CSV, dividends, withholding taxes, and broker fees are parsed automatically. For Simple CSV imports, use the type column with 'dividend' or 'fee' values. All transactions are stored in your ledger and reflected in performance metrics.",
  },
];

function VideoTutorialSection() {
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "video" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section className="py-24 sm:py-32 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            See It in{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Action</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Import your portfolio in under 30 seconds. Choose your format, upload, review, and you&apos;re done.
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
            { step: "1", title: "Choose Format", desc: "Select DeGiro or Simple CSV before uploading" },
            { step: "2", title: "Upload & Review", desc: "Drag & drop your file and preview parsed transactions" },
            { step: "3", title: "Import & Track", desc: "Confirm import and see your holdings instantly on the dashboard" },
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

function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "faq" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section id="faq" className="py-24 sm:py-32 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Questions</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Everything you need to know to get started.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {FAQ_ITEMS.map((item, i) => {
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

function PricingSection() {
  const sectionCb = useCallback(() => trackLanding("landing_pricing_view"), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section id="pricing" className="py-24 sm:py-32" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Simple, Transparent{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Pricing</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Start free, upgrade when you need advanced insights. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {PRICING.map((tier) => (
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
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                  <span className="text-slate-400">{tier.period}</span>
                </div>
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
                onClick={() => trackLanding("landing_cta_click", { cta: `pricing_${tier.name.toLowerCase()}` })}
                className={`block text-center font-semibold py-3 rounded-xl transition-all ${
                  tier.highlighted
                    ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          Annual plan available: €20/year (save 17%)
        </p>
      </div>
    </section>
  );
}

function ComparisonSection() {
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "comparison" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section className="py-24 sm:py-32 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Why Choose{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">StockTracker?</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            We built the portfolio tracker we wished existed — simple, affordable, and smart.
          </p>
        </div>

        <div className="max-w-3xl mx-auto overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="text-left px-6 py-4 text-slate-400 font-medium">Platform</th>
                <th className="text-left px-6 py-4 text-slate-400 font-medium">Price</th>
                <th className="text-left px-6 py-4 text-slate-400 font-medium">Limitation</th>
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c) => (
                <tr key={c.name} className="border-b border-slate-800/50">
                  <td className="px-6 py-4 text-slate-300 font-medium">{c.name}</td>
                  <td className="px-6 py-4 text-slate-400">{c.price}</td>
                  <td className="px-6 py-4 text-slate-500">{c.weakness}</td>
                </tr>
              ))}
              <tr className="bg-emerald-500/5">
                <td className="px-6 py-4 text-emerald-400 font-bold">StockTracker</td>
                <td className="px-6 py-4 text-emerald-400 font-semibold">€2/mo</td>
                <td className="px-6 py-4 text-emerald-400">Simple, AI-powered, cheap, multi-language, web-based</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function InvestorSection() {
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "investor" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section className="py-24 sm:py-32 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Built for Scale</h2>
          <p className="text-lg text-slate-400 leading-relaxed mb-12">
            StockTracker targets over 50 million European retail investors with a product that&apos;s
            10x cheaper than alternatives. Our freemium model drives organic growth, while the €2/month
            Pro tier keeps unit economics healthy from day one.
          </p>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { metric: "50M+", label: "European retail investors", sub: "Addressable market" },
              { metric: "€0.10", label: "Per-user monthly cost", sub: "Infrastructure + AI" },
              { metric: "500", label: "Paying users to profitability", sub: "1,000 EUR/month revenue" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <div className="text-3xl font-extrabold text-emerald-400 mb-1">{item.metric}</div>
                <div className="text-sm font-medium text-white mb-1">{item.label}</div>
                <div className="text-xs text-slate-500">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "cta" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section className="py-24 sm:py-32" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />

          <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Start Tracking Your Portfolio Today
            </h2>
            <p className="text-lg text-emerald-100 max-w-xl mx-auto mb-8">
              Join thousands of European investors who trust StockTracker. Free to start, powerful enough to stay.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                onClick={() => trackLanding("landing_cta_click", { cta: "footer_signup" })}
                className="inline-flex items-center gap-2 bg-white text-emerald-700 font-semibold px-8 py-4 rounded-xl text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
              >
                Create Free Account
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/login"
                onClick={() => trackLanding("landing_cta_click", { cta: "footer_login" })}
                className="text-emerald-100 hover:text-white font-medium transition-colors"
              >
                Already have an account? Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-800/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8" />
            <span className="text-sm font-semibold text-white">StockTracker</span>
          </div>
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} StockTracker. Made in Europe.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── page ─── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NavBar />
      <HeroSection />
      <StatsBar />
      <FeaturesSection />
      <VideoTutorialSection />
      <FAQSection />
      <PricingSection />
      <ComparisonSection />
      <InvestorSection />
      <CTASection />
      <Footer />
    </div>
  );
}
