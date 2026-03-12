"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import type { RefreshInterval, LayoutTheme } from "./types";

const VALID_LAYOUT_THEMES = new Set<string>(["default", "terminal", "canvas", "studio"]);

function getInitialLayoutTheme(): LayoutTheme {
  if (typeof document === "undefined") return "default";
  try {
    const m = document.cookie.match(/(?:^|; )trefolio_layout_theme=([^;]*)/);
    if (m) {
      const val = decodeURIComponent(m[1]);
      if (VALID_LAYOUT_THEMES.has(val)) return val as LayoutTheme;
    }
  } catch {}
  return "default";
}

interface SettingsContextType {
  refreshInterval: RefreshInterval;
  dashboardTheme: LayoutTheme;
  hasGlobalAvKey: boolean;
  alertsEnabled: boolean;
  csvExportEnabled: boolean;
  deviceEnabled: boolean;
  whatsappEnabled: boolean;
  toolTransactionsEnabled: boolean;
  toolDividendsEnabled: boolean;
  toolPerformanceEnabled: boolean;
  toolTaxonomyEnabled: boolean;
  toolRebalancingEnabled: boolean;
  toolAccountsEnabled: boolean;
  toolWatchlistEnabled: boolean;
  setRefreshInterval: (interval: RefreshInterval) => void;
  setDashboardTheme: (theme: LayoutTheme) => void;
  getApiHeaders: () => Record<string, string>;
  getApiParams: () => URLSearchParams;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [refreshInterval, setRefreshIntervalState] = useState<RefreshInterval>(15);
  const [dashboardTheme, setDashboardThemeState] = useState<LayoutTheme>(getInitialLayoutTheme);
  const [hasGlobalAvKey, setHasGlobalAvKey] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [csvExportEnabled, setCsvExportEnabled] = useState(false);
  const [deviceEnabled, setDeviceEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [toolTransactionsEnabled, setToolTransactionsEnabled] = useState(true);
  const [toolDividendsEnabled, setToolDividendsEnabled] = useState(true);
  const [toolPerformanceEnabled, setToolPerformanceEnabled] = useState(true);
  const [toolTaxonomyEnabled, setToolTaxonomyEnabled] = useState(true);
  const [toolRebalancingEnabled, setToolRebalancingEnabled] = useState(false);
  const [toolAccountsEnabled, setToolAccountsEnabled] = useState(true);
  const [toolWatchlistEnabled, setToolWatchlistEnabled] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/user-settings", { cache: "no-store" });
        if (res.ok) {
          const settings = await res.json();
          if ([15, 30, 60].includes(settings.refreshInterval)) {
            setRefreshIntervalState(settings.refreshInterval);
          }
          if (settings.dashboardTheme && ["default", "terminal", "canvas", "studio"].includes(settings.dashboardTheme)) {
            setDashboardThemeState(settings.dashboardTheme);
            try { document.cookie = `trefolio_layout_theme=${settings.dashboardTheme};path=/;max-age=${60 * 60 * 24 * 400};SameSite=Lax`; } catch {}
          }
          if (typeof settings.hasGlobalAvKey === "boolean") {
            setHasGlobalAvKey(settings.hasGlobalAvKey);
          }
          if (typeof settings.alertsEnabled === "boolean") {
            setAlertsEnabled(settings.alertsEnabled);
          }
          if (typeof settings.csvExportEnabled === "boolean") {
            setCsvExportEnabled(settings.csvExportEnabled);
          }
          if (typeof settings.deviceEnabled === "boolean") {
            setDeviceEnabled(settings.deviceEnabled);
          }
          if (typeof settings.whatsappEnabled === "boolean") {
            setWhatsappEnabled(settings.whatsappEnabled);
          }
          if (typeof settings.toolTransactionsEnabled === "boolean") {
            setToolTransactionsEnabled(settings.toolTransactionsEnabled);
          }
          if (typeof settings.toolDividendsEnabled === "boolean") {
            setToolDividendsEnabled(settings.toolDividendsEnabled);
          }
          if (typeof settings.toolPerformanceEnabled === "boolean") {
            setToolPerformanceEnabled(settings.toolPerformanceEnabled);
          }
          if (typeof settings.toolTaxonomyEnabled === "boolean") {
            setToolTaxonomyEnabled(settings.toolTaxonomyEnabled);
          }
          if (typeof settings.toolRebalancingEnabled === "boolean") {
            setToolRebalancingEnabled(settings.toolRebalancingEnabled);
          }
          if (typeof settings.toolAccountsEnabled === "boolean") {
            setToolAccountsEnabled(settings.toolAccountsEnabled);
          }
          if (typeof settings.toolWatchlistEnabled === "boolean") {
            setToolWatchlistEnabled(settings.toolWatchlistEnabled);
          }
        }
      } catch {
        // Keep defaults.
      }
    };

    load();
  }, []);

  const setRefreshInterval = useCallback(async (interval: RefreshInterval) => {
    setRefreshIntervalState(interval);
    try {
      await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshInterval: interval }),
      });
    } catch {
      // Keep optimistic UI state.
    }
  }, []);

  const setDashboardTheme = useCallback(async (theme: LayoutTheme) => {
    setDashboardThemeState(theme);
    try {
      document.cookie = `trefolio_layout_theme=${theme};path=/;max-age=${60 * 60 * 24 * 400};SameSite=Lax`;
    } catch { /* SSR */ }
    try {
      await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardTheme: theme }),
      });
    } catch {
      // Keep optimistic UI state.
    }
  }, []);

  const getApiHeaders = useCallback((): Record<string, string> => {
    return {};
  }, []);

  const getApiParams = useCallback((): URLSearchParams => {
    return new URLSearchParams();
  }, []);

  const value = useMemo(
    () => ({
      refreshInterval,
      dashboardTheme,
      hasGlobalAvKey,
      alertsEnabled,
      csvExportEnabled,
      deviceEnabled,
      whatsappEnabled,
      toolTransactionsEnabled,
      toolDividendsEnabled,
      toolPerformanceEnabled,
      toolTaxonomyEnabled,
      toolRebalancingEnabled,
      toolAccountsEnabled,
      toolWatchlistEnabled,
      setRefreshInterval,
      setDashboardTheme,
      getApiHeaders,
      getApiParams,
    }),
    [
      refreshInterval, dashboardTheme, hasGlobalAvKey, alertsEnabled, csvExportEnabled, deviceEnabled,
      whatsappEnabled, toolTransactionsEnabled, toolDividendsEnabled, toolPerformanceEnabled,
      toolTaxonomyEnabled, toolRebalancingEnabled, toolAccountsEnabled, toolWatchlistEnabled,
      setRefreshInterval, setDashboardTheme, getApiHeaders, getApiParams,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
}

export function useSettingsSafe() {
  return useContext(SettingsContext);
}
