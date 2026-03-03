"use client";

import { I18nProvider } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings-context";
import { PortfolioProvider } from "@/lib/portfolio-context";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import StockIntelligence from "@/components/StockIntelligence";

interface PageProps {
  params: { ticker: string };
  searchParams: { exchange?: string };
}

export default function StockIntelligencePage({ params, searchParams }: PageProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <SettingsProvider>
            <PortfolioProvider>
              <StockIntelligence
                ticker={decodeURIComponent(params.ticker)}
                exchange={searchParams.exchange || ""}
              />
            </PortfolioProvider>
          </SettingsProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
