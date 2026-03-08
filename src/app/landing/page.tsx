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

const HERO_FEATURES = [
  {
    tag: "Portfolio",
    title: "All Your Investments in One Place",
    description:
      "Real-time portfolio dashboard with multi-exchange support. See your total value, daily changes, and per-stock breakdowns across NYSE, XETRA, LSE, Madrid, and more — with automatic currency conversion.",
    screenshot: "/screenshots/dashboard-overview.png",
    points: [
      "Real-time quotes from Yahoo Finance",
      "Multi-currency (EUR, USD, GBP, DKK, CAD)",
      "Performance metrics: TTWROR & IRR",
      "Benchmark vs S&P 500, Nasdaq, Euro Stoxx 50",
    ],
  },
  {
    tag: "Dividends",
    title: "Track & Project Your Dividend Income",
    description:
      "Monitor estimated annual income, per-stock dividend yields, upcoming ex-dividend dates, and yearly history. View monthly income vs. realized gains — and plan your passive income strategy.",
    screenshot: "/screenshots/dividends.png",
    points: [
      "Estimated annual dividend income",
      "Per-stock yield breakdowns",
      "Ex-dividend calendar (next 90 days)",
      "Monthly income chart with realized gains",
    ],
  },
  {
    tag: "AI Insights",
    tagBadge: "Pro",
    title: "AI-Powered Analysis at Your Fingertips",
    description:
      "Get plain-language explanations of stock fundamentals, market news sentiment, insider trades, and institutional holdings. Powered by GPT for clear, actionable insights.",
    screenshot: "/screenshots/holdings-table.png",
    points: [
      "AI Portfolio Review with recommendations",
      "Portfolio news feed with sentiment",
      "Company fundamentals analysis",
      "Insider & institutional activity",
    ],
  },
  {
    tag: "Import",
    title: "Import Your Portfolio in Seconds",
    description:
      "Visit the unified /import page — multiple methods in one place: 13 broker CSV formats, automatic Broker Sync, AI Import, and manual entry. Step-by-step guides are built in for each method. Buys, sells, dividends, and fees are parsed automatically.",
    screenshot: "/screenshots/tools-page.png",
    points: [
      "13 broker CSV formats: DEGIRO, IBKR, Trading 212, Revolut, Schwab, Fidelity, and more",
      "Automatic Broker Sync — connect your brokerage directly (Pro)",
      "AI Import for any screenshot or unsupported format",
      "Built-in step-by-step guides for each method",
    ],
  },
];

const FEATURE_CARDS = [
  {
    icon: "chart",
    title: "Performance Metrics",
    desc: "TTWROR and IRR calculations with clear methodology explanations",
  },
  {
    icon: "currency",
    title: "Multi-Currency",
    desc: "Automatic EUR/USD/GBP conversion across all supported exchanges",
  },
  {
    icon: "sparkle",
    title: "AI & News",
    desc: "Portfolio news feed, sentiment analysis, and AI-powered stock insights",
  },
  {
    icon: "upload",
    title: "Broker Import",
    desc: "13 broker CSV formats, automatic Broker Sync, AI Import, and manual entry. Step-by-step guides for every method.",
  },
  {
    icon: "pie",
    title: "Diversification",
    desc: "Sector, region, asset class breakdowns with donut charts and rebalancing targets",
  },
  {
    icon: "eye",
    title: "Stealth Mode",
    desc: "Hide all monetary values with one click — perfect for screen-sharing or public spaces",
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
      "Up to 15 stocks & ETFs",
      "Real-time Yahoo Finance quotes",
      "Historical price charts",
      "Cash balance tracking",
      "Benchmark comparison (S&P 500, etc.)",
      "14 broker imports (DEGIRO, IBKR, Trading 212, etc.)",
      "Dark & light mode",
      "35+ languages",
      "5 AI analysis calls/month",
      "2 price alerts (in-app)",
      "30-day portfolio history",
    ],
    cta: "Get Started Free",
  },
  {
    name: "Starter",
    price: "€3.99",
    period: "/month",
    description: "For growing investors who want more room and sharing.",
    features: [
      "Everything in Free, plus:",
      "Up to 50 stocks & ETFs",
      "20 AI analysis calls/month",
      "10 price alerts + email delivery",
      "1-year portfolio growth history",
      "Portfolio sharing (public link)",
      "CSV export of holdings & transactions",
    ],
    cta: "Start with Starter",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "€7.49",
    period: "/month",
    description: "Full power for serious investors. 40% cheaper than alternatives.",
    features: [
      "Everything in Starter, plus:",
      "Unlimited holdings",
      "Unlimited AI analysis",
      "Company fundamentals (income, balance, cash flow)",
      "Stock intelligence (news, insider trades)",
      "Portfolio news feed across all holdings",
      "Economic indicators dashboard",
      "Alpha Vantage premium data",
      "AI Portfolio Review (5/month)",
      "Unlimited price alerts + email delivery",
      "Advanced metrics (Sharpe, Drawdown, Volatility)",
      "Full portfolio history (all time)",
      "Automatic Broker Sync (20+ brokerages)",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
];

/* ─── FAQ data ─── */

const FAQ_ITEMS = [
  {
    q: "How do I import my portfolio?",
    a: "Go to the /import page to access all import methods: 13 broker CSV formats (DEGIRO, IBKR, Trading 212, Revolut, Schwab, Fidelity, and more), AI Import for screenshots or unsupported formats, and manual entry. Each method has a built-in step-by-step guide. Pro users can also use Broker Sync to connect their brokerage directly and import automatically.",
  },
  {
    q: "What CSV formats are supported?",
    a: "13 broker CSV formats: DEGIRO, Interactive Brokers, Trading 212, Revolut, Charles Schwab, Fidelity, Nordnet, Tastytrade, Freetrade, eToro, Wealthsimple, Questrade, Firstrade, plus a Simple CSV format. For any other format, use AI Import — upload a screenshot or paste your file and AI will parse it. Pro users can also use Broker Sync for automatic one-click import from 20+ brokerages.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted at rest, passwords are hashed with bcrypt, and sessions use secure HTTP-only cookies. We never sell or share your data with third parties.",
  },
  {
    q: "What exchanges are supported?",
    a: "trefolio supports NYSE, NASDAQ, XETRA, LSE, Amsterdam (AMS), Madrid (MAD), Copenhagen (OMK), and more. Multi-currency conversion between EUR, USD, GBP, DKK, and CAD is handled automatically.",
  },
  {
    q: "How are performance metrics calculated?",
    a: "TTWROR uses the Modified Dietz method, which weights each cash flow by the fraction of the period remaining — so returns reflect market performance only, not deposit timing. IRR (XIRR) finds the annualized rate that makes the net present value of all dated cash flows equal zero.",
  },
  {
    q: "What's the difference between the plans?",
    a: "Free includes 15 holdings, real-time quotes, charts, broker import, and 5 AI calls/month. Starter (€3.99/month) raises the limit to 50 holdings, 20 AI calls, portfolio sharing, and CSV export. Pro (€7.49/month) adds unlimited holdings, unlimited AI, fundamentals, intelligence, economic indicators, Alpha Vantage, and advanced metrics.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Starter and Pro are billed monthly or annually (save ~37% with annual billing). Cancel anytime from the billing portal — your paid features remain active until the end of the billing period.",
  },
  {
    q: "How do dividends and fees get tracked?",
    a: "When you import a broker CSV (DEGIRO, IBKR, Trading 212, or Revolut), dividends, withholding taxes, and broker fees are parsed automatically. For Simple CSV imports, use the type column with 'dividend' or 'fee' values. All transactions are stored in your ledger and reflected in performance metrics.",
  },
];

/* ─── testimonials ─── */

const TESTIMONIALS = [
  {
    quote: "Finally a portfolio tracker that doesn't cost a fortune. The broker import worked perfectly — all my transactions appeared in seconds.",
    name: "Marc R.",
    role: "Retail Investor, Netherlands",
  },
  {
    quote: "The AI analysis gives me quick insights without having to dig through financial reports. Worth every cent of the Pro plan.",
    name: "Laura S.",
    role: "Long-term Investor, Spain",
  },
  {
    quote: "Clean interface, fast imports, and it actually shows my real returns. Switched from spreadsheets and never looked back.",
    name: "Thomas K.",
    role: "ETF Investor, Germany",
  },
];

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

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
            {NAV_LINKS.map((link) => (
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
            {NAV_LINKS.map((link) => (
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
              <Link
                href="/login"
                className="block px-4 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="block text-center bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-lg transition-all"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── hero section ─── */

function HeroSection() {
  useEffect(() => {
    trackLanding("landing_page_view");
  }, []);

  const valuePropItems = [
    "All your investments in one place",
    "Know your real performance",
    "AI-powered insights & analysis",
  ];

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
            <span className="text-sm font-medium text-emerald-400">Now with AI-powered insights</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
            Simple and Powerful{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Portfolio Tracker
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
            Track your stock portfolio with real-time quotes, dividend projections, and AI analysis.
            Built for European investors. Free to start.
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
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white font-medium px-6 py-4 rounded-xl border border-slate-700 hover:border-slate-500 transition-all"
            >
              See Features
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Hero screenshot */}
        <div className="relative max-w-5xl mx-auto">
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/50 bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/screenshots/dashboard-overview.png"
              alt="trefolio Dashboard showing portfolio summary, performance metrics, and growth projection"
              className="w-full h-auto"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── stats bar ─── */

const STATS = [
  { value: "Real-time", label: "Stock Quotes" },
  { value: "5+", label: "Exchanges" },
  { value: "AI", label: "Powered Insights" },
  { value: "€0", label: "To Get Started" },
];

function StatsBar() {
  return (
    <section className="py-10 border-y border-slate-800/50 bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map((stat) => (
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
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "features" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section id="features" className="py-20 sm:py-28" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything You Need to Invest{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Confidently
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            From real-time tracking to AI-powered analysis — built for European retail investors who want clarity, not complexity.
          </p>
        </div>

        {/* Alternating feature rows */}
        <div className="space-y-24">
          {HERO_FEATURES.map((feature, i) => {
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

        {/* Feature grid cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-24">
          {FEATURE_CARDS.map((card) => (
            <div
              key={card.title}
              className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-emerald-500/30 hover:bg-slate-800/50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <FeatureIcon type={card.icon} />
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

/* ─── testimonials / social proof ─── */

function TestimonialsSection() {
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "testimonials" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            What Investors{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Love About Us
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Join investors across Europe who track their portfolios with trefolio.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 hover:border-slate-700 transition-colors"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 leading-relaxed mb-6 text-sm">&ldquo;{t.quote}&rdquo;</p>
              <div>
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-xs text-slate-500">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── why trefolio (positive comparison) ─── */

function WhySection() {
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "why" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  const comparisons = [
    { feature: "15 holdings free, unlimited on Pro", us: true, others: false, spreadsheets: true },
    { feature: "Real-time quotes", us: true, others: true, spreadsheets: false },
    { feature: "Multi-exchange & multi-currency", us: true, others: true, spreadsheets: false },
    { feature: "AI-powered analysis", us: true, others: false, spreadsheets: false },
    { feature: "Broker CSV + API import", us: true, others: true, spreadsheets: false },
    { feature: "Dividend tracking & projections", us: true, others: true, spreadsheets: false },
    { feature: "Privacy-first (no data selling)", us: true, others: false, spreadsheets: true },
    { feature: "Pro plan under €40/year", us: true, others: false, spreadsheets: true },
    { feature: "No learning curve", us: true, others: false, spreadsheets: false },
  ];

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
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Why Choose{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              trefolio?
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            The portfolio tracker we wished existed — simple, affordable, and smart.
          </p>
        </div>

        <div className="max-w-3xl mx-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-4 text-slate-400 font-medium">Feature</th>
                <th className="text-center px-4 py-4 text-emerald-400 font-semibold">trefolio</th>
                <th className="text-center px-4 py-4 text-slate-400 font-medium">Other Trackers</th>
                <th className="text-center px-4 py-4 text-slate-400 font-medium">Spreadsheets</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row) => (
                <tr key={row.feature} className="border-b border-slate-800/50">
                  <td className="px-4 py-3.5 text-slate-300">{row.feature}</td>
                  <td className="px-4 py-3.5">{row.us ? <Check /> : <Cross />}</td>
                  <td className="px-4 py-3.5">{row.others ? <Check /> : <Cross />}</td>
                  <td className="px-4 py-3.5">{row.spreadsheets ? <Check /> : <Cross />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ─── video section ─── */

function VideoTutorialSection() {
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "video" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
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
            { step: "3", title: "Import & Track", desc: "Confirm import and see your holdings instantly" },
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
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "install_app" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Get trefolio on Your{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Home Screen
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            No app store needed. Install trefolio directly from your browser and access your portfolio like a native app &mdash; with home screen widgets on iOS.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              ),
              title: "Install from Browser",
              desc: "Tap \"Add to Home Screen\" in Safari (iOS) or the install banner in Chrome (Android). Opens full-screen, no browser chrome.",
            },
            {
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              ),
              title: "Home Screen Widget",
              desc: "See your portfolio value, daily P/L, and top holdings at a glance with a Scriptable widget on iOS.",
            },
            {
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              ),
              title: "Works Offline",
              desc: "App shell is cached for instant loading. View your last portfolio snapshot even without network.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-emerald-500/30 hover:bg-slate-800/50 transition-all text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                {item.icon}
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">{item.title}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── device promotion section (gated by device_enabled flag) ─── */

function DeviceSection() {
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
      setEnrollError("Please enter a valid email address.");
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
      title: "1.91\" AMOLED Display",
      desc: "Vivid colors and deep blacks — your portfolio looks stunning on a dedicated screen.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      title: "Live Portfolio at a Glance",
      desc: "Total value, daily P/L, and top holdings update automatically — no phone needed.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      ),
      title: "AI Insights On-Device",
      desc: "Get a condensed AI portfolio review directly on the hardware display — Pro feature.",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
      ),
      title: "Over-the-Air Updates",
      desc: "Firmware updates roll out automatically so your device keeps getting better.",
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
                alt="trefolio Leaf AMOLED device showing the portfolio dashboard with live holdings and AI insights"
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
                  Hardware
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  Coming Soon
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
                Your Portfolio on a{" "}
                <span className="bg-gradient-to-r from-violet-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Dedicated Display
                </span>
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                The trefolio Leaf is a pocket-sized AMOLED device that keeps your portfolio visible on your desk. Connect over WiFi, pair with a passkey, and watch your investments update in real time.
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
                placeholder="Enter your email"
                className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm"
                required
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-violet-600/25 hover:shadow-violet-500/30 text-sm whitespace-nowrap"
              >
                Get Notified
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </form>
            {enrollError && (
              <p className="text-xs text-red-400 mt-1">{enrollError}</p>
            )}

            <p className="text-xs text-slate-500">
              Buyers get a free year of trefolio Pro included with the device. Not financial advice.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ section ─── */

function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const sectionCb = useCallback(() => trackLanding("landing_section_view", { section: "faq" }), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section id="faq" className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
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

/* ─── pricing section ─── */

function PricingSection() {
  const sectionCb = useCallback(() => trackLanding("landing_pricing_view"), []);
  const sectionRef = useInViewOnce(sectionCb);

  return (
    <section id="pricing" className="py-20 sm:py-28 border-t border-slate-800/50" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Simple, Transparent{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Pricing</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Start free. Starter at €3.99/month, Pro at €7.49/month — up to 40% cheaper than alternatives. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
                className={`block text-center font-semibold py-3.5 rounded-xl transition-all ${
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
          Annual plans: Starter €29.99/year, Pro €59.99/year (save ~37%). Cancel anytime.
        </p>

        {/* Competitor price comparison */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold text-white text-center mb-8">
            How We Compare on Price
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: "trefolio Pro", price: "€60", period: "/year", highlight: true },
              { name: "Snowball Starter", price: "$80", period: "/year", highlight: false },
              { name: "Snowball Investor", price: "$150", period: "/year", highlight: false },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-5 text-center ${
                  plan.highlight
                    ? "bg-emerald-500/10 border-2 border-emerald-500/40"
                    : "bg-slate-900/50 border border-slate-800"
                }`}
              >
                <div className={`text-2xl sm:text-3xl font-extrabold mb-1 ${
                  plan.highlight ? "text-emerald-400" : "text-slate-400"
                }`}>
                  {plan.price}
                </div>
                <div className="text-xs text-slate-500 mb-2">{plan.period}</div>
                <div className={`text-sm font-medium ${
                  plan.highlight ? "text-white" : "text-slate-400"
                }`}>
                  {plan.name}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 mt-6">
            Up to 2x cheaper than comparable portfolio trackers. Free tier includes 15 holdings — Pro unlocks unlimited.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── CTA section ─── */

function CTASection() {
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
              Start Tracking Your Portfolio Today
            </h2>
            <p className="text-lg text-emerald-100 max-w-xl mx-auto mb-8">
              Join investors across Europe who trust trefolio. Free to start, powerful enough to stay.
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

/* ─── footer ─── */

function Footer() {
  const footerLinks = {
    product: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
      { label: "Blog", href: "/blog" },
      { label: "Contact Us", href: "/contact" },
    ],
    account: [
      { label: "Sign Up", href: "/signup" },
      { label: "Log In", href: "/login" },
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  };

  return (
    <footer className="border-t border-slate-800/50 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Logo className="w-8 h-8" />
              <span className="text-lg font-bold text-white">trefolio</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              The simplest way to manage your stock portfolio. Built for European investors.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Account</h4>
            <ul className="space-y-3">
              {footerLinks.account.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} trefolio. Made in Europe.
          </p>
          <p className="text-xs text-slate-600">
            Market data provided by Yahoo Finance and Alpha Vantage. Not financial advice.
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
      <TestimonialsSection />
      <WhySection />
      <VideoTutorialSection />
      <InstallAppSection />
      <DeviceSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
