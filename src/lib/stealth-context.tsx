"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "trefolio_stealth";

interface StealthContextType {
  stealthMode: boolean;
  toggleStealth: () => void;
}

const StealthContext = createContext<StealthContextType | null>(null);

export function StealthProvider({ children }: { children: React.ReactNode }) {
  const [stealthMode, setStealthMode] = useState(false);

  useEffect(() => {
    try {
      setStealthMode(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage unavailable (SSR or restricted browser)
    }
  }, []);

  const toggleStealth = useCallback(() => {
    setStealthMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <StealthContext.Provider value={{ stealthMode, toggleStealth }}>
      {children}
    </StealthContext.Provider>
  );
}

export function useStealthMode(): StealthContextType {
  const ctx = useContext(StealthContext);
  if (!ctx) throw new Error("useStealthMode must be used within StealthProvider");
  return ctx;
}
