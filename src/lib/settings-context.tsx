"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import type { RefreshInterval } from "./types";

interface SettingsContextType {
  refreshInterval: RefreshInterval;
  hasGlobalAvKey: boolean;
  alertsEnabled: boolean;
  csvExportEnabled: boolean;
  deviceEnabled: boolean;
  setRefreshInterval: (interval: RefreshInterval) => void;
  getApiHeaders: () => Record<string, string>;
  getApiParams: () => URLSearchParams;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [refreshInterval, setRefreshIntervalState] = useState<RefreshInterval>(15);
  const [hasGlobalAvKey, setHasGlobalAvKey] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [csvExportEnabled, setCsvExportEnabled] = useState(false);
  const [deviceEnabled, setDeviceEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/user-settings", { cache: "no-store" });
        if (res.ok) {
          const settings = await res.json();
          if ([15, 30, 60].includes(settings.refreshInterval)) {
            setRefreshIntervalState(settings.refreshInterval);
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

  const getApiHeaders = useCallback((): Record<string, string> => {
    return {};
  }, []);

  const getApiParams = useCallback((): URLSearchParams => {
    return new URLSearchParams();
  }, []);

  const value = useMemo(
    () => ({
      refreshInterval,
      hasGlobalAvKey,
      alertsEnabled,
      csvExportEnabled,
      deviceEnabled,
      setRefreshInterval,
      getApiHeaders,
      getApiParams,
    }),
    [
      refreshInterval, hasGlobalAvKey, alertsEnabled, csvExportEnabled, deviceEnabled,
      setRefreshInterval, getApiHeaders, getApiParams,
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
