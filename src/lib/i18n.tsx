"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { Language } from "./types";
import { isValidLanguage } from "./languages";
import type { TranslationStrings } from "@/locales/types";
import en from "@/locales/en";
import { setTrefolioUiLocaleCookieClient } from "@/lib/idp/trefolio-ui-locale-cookie.client";

export type TranslationKey = keyof typeof en;

const localeCache = new Map<string, TranslationStrings>();
localeCache.set("en", en);

const loaders: Record<string, () => Promise<{ default: TranslationStrings }>> = {
  en: () => import("@/locales/en"),
  es: () => import("@/locales/es"),
  fr: () => import("@/locales/fr"),
  de: () => import("@/locales/de"),
  it: () => import("@/locales/it"),
  pt: () => import("@/locales/pt"),
  nl: () => import("@/locales/nl"),
  pl: () => import("@/locales/pl"),
  cs: () => import("@/locales/cs"),
  sk: () => import("@/locales/sk"),
  hu: () => import("@/locales/hu"),
  ro: () => import("@/locales/ro"),
  bg: () => import("@/locales/bg"),
  hr: () => import("@/locales/hr"),
  sl: () => import("@/locales/sl"),
  el: () => import("@/locales/el"),
  sv: () => import("@/locales/sv"),
  da: () => import("@/locales/da"),
  fi: () => import("@/locales/fi"),
  et: () => import("@/locales/et"),
  lv: () => import("@/locales/lv"),
  lt: () => import("@/locales/lt"),
  ga: () => import("@/locales/ga"),
  mt: () => import("@/locales/mt"),
  nb: () => import("@/locales/nb"),
  uk: () => import("@/locales/uk"),
  tr: () => import("@/locales/tr"),
  sr: () => import("@/locales/sr"),
  is: () => import("@/locales/is"),
  sq: () => import("@/locales/sq"),
  bs: () => import("@/locales/bs"),
  mk: () => import("@/locales/mk"),
  be: () => import("@/locales/be"),
  ca: () => import("@/locales/ca"),
  cy: () => import("@/locales/cy"),
};

async function loadLocale(lang: Language): Promise<TranslationStrings> {
  const cached = localeCache.get(lang);
  if (cached) return cached;

  const loader = loaders[lang];
  if (!loader) return en;

  try {
    const mod = await loader();
    localeCache.set(lang, mod.default);
    return mod.default;
  } catch {
    return en;
  }
}

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [strings, setStrings] = useState<TranslationStrings>(en);
  const loadingRef = useRef(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const res = await fetch("/api/user-settings", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const next = data.language as string | undefined;
        const resolved: Language =
          next && isValidLanguage(next) ? next : "en";
        setLanguageState(resolved);
        const strs = await loadLocale(resolved);
        setStrings(strs);
        setTrefolioUiLocaleCookieClient(resolved);
      } catch {
        // Keep default language if request fails.
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLanguageState(lang);
    setTrefolioUiLocaleCookieClient(lang);
    try {
      const strs = await loadLocale(lang);
      setStrings(strs);
    } finally {
      loadingRef.current = false;
    }
    fetch("/api/user-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang }),
    }).catch(() => {});
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return strings[key] || en[key] || key;
    },
    [strings]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}

/**
 * Lightweight provider for public pages (landing, pricing).
 * Detects language from browser settings / localStorage instead of the user API.
 */
export function LandingI18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [strings, setStrings] = useState<TranslationStrings>(en);
  const loadingRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem("trefolio_lang");
    const browserLang = navigator.language.split("-")[0];
    let initial: Language = "en";
    if (stored && isValidLanguage(stored)) initial = stored;
    else if (isValidLanguage(browserLang)) initial = browserLang;
    setLanguageState(initial);
    loadLocale(initial).then(setStrings);
    setTrefolioUiLocaleCookieClient(initial);
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLanguageState(lang);
    localStorage.setItem("trefolio_lang", lang);
    setTrefolioUiLocaleCookieClient(lang);
    try {
      const strs = await loadLocale(lang);
      setStrings(strs);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return strings[key] || en[key] || key;
    },
    [strings]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}
