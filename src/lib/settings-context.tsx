"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ApiProviderName } from "./types";

const AV_USAGE_KEY = "stocktracker-av-usage";
const AV_DAILY_LIMIT = 25;

interface DailyUsage {
  date: string;
  count: number;
}

interface SettingsContextType {
  provider: ApiProviderName;
  alphaVantageApiKey: string;
  setProvider: (provider: ApiProviderName) => void;
  setAlphaVantageApiKey: (key: string) => void;
  isAlphaVantage: boolean;
  getApiHeaders: () => Record<string, string>;
  getApiParams: () => URLSearchParams;
  avCallsToday: number;
  avDailyLimit: number;
  trackAvCalls: (response: Response) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function loadDailyUsage(): DailyUsage {
  if (typeof window === "undefined") return { date: todayKey(), count: 0 };
  try {
    const stored = localStorage.getItem(AV_USAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DailyUsage;
      if (parsed.date === todayKey()) return parsed;
    }
  } catch { /* ignore */ }
  return { date: todayKey(), count: 0 };
}

function saveDailyUsage(usage: DailyUsage) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AV_USAGE_KEY, JSON.stringify(usage));
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProviderState] = useState<ApiProviderName>("yahoo");
  const [alphaVantageApiKey, setAlphaVantageApiKeyState] = useState("");
  const [avCallsToday, setAvCallsToday] = useState(() => loadDailyUsage().count);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/user-settings", { cache: "no-store" });
        if (res.ok) {
          const settings = await res.json();
          if (settings.provider === "yahoo" || settings.provider === "alphavantage") {
            setProviderState(settings.provider);
          }
          if (typeof settings.alphaVantageApiKey === "string") {
            setAlphaVantageApiKeyState(settings.alphaVantageApiKey);
          }
        }
      } catch {
        // Keep defaults.
      }
    };

    load();
  }, []);

  const setProvider = useCallback(async (p: ApiProviderName) => {
    setProviderState(p);
    try {
      await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: p }),
      });
    } catch {
      // Keep optimistic UI state.
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("stocktracker-quotes-v3");
      localStorage.removeItem("stocktracker-rates-v1");
    }
  }, []);

  const setAlphaVantageApiKey = useCallback(async (key: string) => {
    setAlphaVantageApiKeyState(key);
    try {
      await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alphaVantageApiKey: key }),
      });
    } catch {
      // Keep optimistic UI state.
    }
  }, []);

  const getApiHeaders = useCallback((): Record<string, string> => {
    if (provider === "alphavantage" && alphaVantageApiKey) {
      return { "x-api-key": alphaVantageApiKey };
    }
    return {};
  }, [provider, alphaVantageApiKey]);

  const getApiParams = useCallback((): URLSearchParams => {
    const params = new URLSearchParams();
    params.set("provider", provider);
    return params;
  }, [provider]);

  const trackAvCalls = useCallback((response: Response) => {
    const header = response.headers.get("x-av-calls");
    if (!header) return;
    const count = parseInt(header, 10);
    if (isNaN(count) || count <= 0) return;
    setAvCallsToday((prev) => {
      const newCount = prev + count;
      saveDailyUsage({ date: todayKey(), count: newCount });
      return newCount;
    });
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        provider,
        alphaVantageApiKey,
        setProvider,
        setAlphaVantageApiKey,
        isAlphaVantage: provider === "alphavantage",
        getApiHeaders,
        getApiParams,
        avCallsToday,
        avDailyLimit: AV_DAILY_LIMIT,
        trackAvCalls,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
}
