"use client";

import Link from "next/link";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings-context";
import { StealthProvider } from "@/lib/stealth-context";
import { PortfolioProvider } from "@/lib/portfolio-context";
import Dashboard from "@/components/Dashboard";
import AppNav from "@/components/AppNav";
import MarketTickerBar from "@/components/MarketTickerBar";
import MobileTabBar from "@/components/MobileTabBar";
import type { Holding, CashEntry, QuoteData, ExchangeRates } from "@/lib/types";

interface Props {
  initialHoldings: Holding[];
  initialCash: CashEntry[];
  initialQuotes: Record<string, QuoteData>;
  initialExchangeRates: ExchangeRates;
}

export default function DemoShell({
  initialHoldings, initialCash, initialQuotes, initialExchangeRates,
}: Props) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <SettingsProvider>
            <StealthProvider>
              <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-14 sm:pb-0">
                <DemoBanner />
                <MarketTickerBar demoMode />
                <AppNav />
                <main id="main-content">
                  <PortfolioProvider
                    initialHoldings={initialHoldings}
                    initialCash={initialCash}
                    demoMode
                    initialQuotes={initialQuotes}
                    initialExchangeRates={initialExchangeRates}
                  >
                    <Dashboard />
                  </PortfolioProvider>
                </main>
                <MobileTabBar />
              </div>
            </StealthProvider>
          </SettingsProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 bg-emerald-600 text-white text-center py-2.5 px-4 text-sm font-medium shadow-md">
      <span className="inline-flex items-center gap-2">
        <span className="bg-white text-emerald-700 font-bold text-[10px] tracking-widest uppercase px-2 py-0.5 rounded">
          Demo
        </span>
        <span>You&apos;re viewing a demo portfolio with sample data.</span>
      </span>
      <Link
        href="/signup"
        className="inline-flex items-center gap-1 ml-2 bg-white text-emerald-700 font-semibold px-3 py-1 rounded-md text-xs hover:bg-emerald-50 transition-colors"
      >
        Sign Up Free to track your own
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </Link>
    </div>
  );
}
