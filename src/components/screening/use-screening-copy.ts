"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { getScreeningCopy, type ScreeningCopy } from "@/lib/screening/copy";

/** Screening copy for the active UI language, falling back to English. */
export function useScreeningCopy(): { copy: ScreeningCopy; language: string } {
  const { language } = useI18n();
  const copy = useMemo(() => getScreeningCopy(language), [language]);
  return { copy, language };
}
