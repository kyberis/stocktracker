"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ApiProviderName } from "./types";

const AV_USAGE_KEY = "stocktracker-av-usage";
const AV_MINUTE_LIMIT = 75;

interface MinuteUsage {
  minuteKey: string;
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
  avCallsThisMinute: number;
  avMinuteLimit: number;
  trackAvCalls: (response: Response) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

function minuteKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate()
  ).padStart(2, "0")}T${String(now.getUTCHours()).padStart(2, "0")}:${String(
    now.getUTCMinutes()
  ).padStart(2, "0")}`;
}

function loadMinuteUsage(): MinuteUsage {
  if (typeof window === "undefined") return { minuteKey: minuteKey(), count: 0 };
  try {
    const stored = localStorage.getItem(AV_USAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as MinuteUsage;
      if (parsed.minuteKey === minuteKey()) return parsed;
    }
  } catch { /* ignore */ }
  return { minuteKey: minuteKey(), count: 0 };
}

function saveMinuteUsage(usage: MinuteUsage) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AV_USAGE_KEY, JSON.stringify(usage));
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProviderState] = useState<ApiProviderName>("yahoo");
  const [alphaVantageApiKey, setAlphaVantageApiKeyState] = useState("");
  const [avCallsThisMinute, setAvCallsThisMinute] = useState(() => loadMinuteUsage().count);

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

  useEffect(() => {
    const id = window.setInterval(() => {
      const usage = loadMinuteUsage();
      if (usage.minuteKey !== minuteKey()) {
        saveMinuteUsage({ minuteKey: minuteKey(), count: 0 });
        setAvCallsThisMinute(0);
      }
    }, 5000);

    return () => window.clearInterval(id);
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
    setAvCallsThisMinute((prev) => {
      const usage = loadMinuteUsage();
      const base = usage.minuteKey === minuteKey() ? usage.count : 0;
      const newCount = base + count;
      saveMinuteUsage({ minuteKey: minuteKey(), count: newCount });
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
        avCallsThisMinute,
        avMinuteLimit: AV_MINUTE_LIMIT,
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
