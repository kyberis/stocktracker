"use client";

import { I18nProvider } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings-context";
import { PortfolioProvider } from "@/lib/portfolio-context";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import StockDetail from "@/components/StockDetail";

interface PageProps {
  params: { ticker: string };
  searchParams: { exchange?: string };
}

export default function StockDetailPage({ params, searchParams }: PageProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <SettingsProvider>
            <PortfolioProvider>
              <StockDetail
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
