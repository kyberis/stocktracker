"use client";

import { I18nProvider } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings-context";
import { PortfolioProvider } from "@/lib/portfolio-context";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <SettingsProvider>
            <PortfolioProvider>
              <Dashboard />
            </PortfolioProvider>
          </SettingsProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
