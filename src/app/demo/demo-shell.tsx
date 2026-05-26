"use client";

import Link from "next/link";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { LandingI18nProvider } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings-context";
import { StealthProvider } from "@/lib/stealth-context";
import { PortfolioProvider } from "@/lib/portfolio-context";
import { PortfolioCommandProvider } from "@/contexts/portfolio-command-context";
import Dashboard from "@/components/Dashboard";
import AppNav from "@/components/AppNav";
import MarketTickerBar from "@/components/MarketTickerBar";
import MobileTabBar from "@/components/MobileTabBar";
import type { Holding, CashEntry, QuoteData, ExchangeRates, Goal } from "@/lib/types";

interface Props {
  initialHoldings: Holding[];
  initialCash: CashEntry[];
  initialQuotes: Record<string, QuoteData>;
  initialExchangeRates: ExchangeRates;
}

const DEMO_GOAL: Goal = {
  id: "demo-goal",
  userId: "demo",
  portfolioId: "",
  name: "€500K Portfolio",
  goalType: "retirement",
  targetAmount: 500000,
  currency: "EUR",
  growthRate: 7,
  yearlyContribution: 6000,
  monthlyContribution: 500,
  contributionMode: "monthly",
  reinvestDividends: true,
  horizon: 20,
  targetDate: null,
  priority: 1,
  milestones: [
    { percent: 25, label: "25%", reachedAt: null },
    { percent: 50, label: "50%", reachedAt: null },
    { percent: 75, label: "75%", reachedAt: null },
    { percent: 100, label: "100%", reachedAt: null },
  ],
  notes: "",
  icon: "",
  color: "",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export default function DemoShell({
  initialHoldings, initialCash, initialQuotes, initialExchangeRates,
}: Props) {
  return (
    <ThemeProvider>
      <AuthProvider demoMode>
        <LandingI18nProvider>
          <SettingsProvider demoMode>
            <StealthProvider>
              <PortfolioProvider
                initialHoldings={initialHoldings}
                initialCash={initialCash}
                demoMode
                initialQuotes={initialQuotes}
                initialExchangeRates={initialExchangeRates}
                initialGoal={DEMO_GOAL}
              >
                <PortfolioCommandProvider>
                  <div
                    className="min-h-screen pb-14 sm:pb-0"
                    style={{
                      background: "var(--shell-background)",
                      fontFamily: "var(--font-primary, inherit)",
                    }}
                  >
                    <DemoBanner />
                    <MarketTickerBar demoMode />
                    <AppNav demoMode />
                    <main id="main-content">
                      <Dashboard />
                    </main>
                    <MobileTabBar />
                  </div>
                </PortfolioCommandProvider>
              </PortfolioProvider>
            </StealthProvider>
          </SettingsProvider>
        </LandingI18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-[color:var(--surface-strong)]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-3 py-2 text-sm text-[color:var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5 text-left">
          <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-emerald-500/18 bg-emerald-500/10 px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-500">
            Demo
          </span>
          <p className="min-w-0 text-sm leading-5">
            <span className="font-semibold text-[color:var(--foreground)]">Sample portfolio.</span>{" "}
            You&apos;re viewing preloaded holdings and market data.
          </p>
        </div>
        <Link
          href="/signup"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-highlight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 sm:self-auto"
        >
          Sign up free
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
