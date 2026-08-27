"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { getRealEstateCopy, type RealEstateCopy } from "@/lib/real-estate-screening/copy";

export function useRealEstateCopy(): { copy: RealEstateCopy; language: string } {
  const { language } = useI18n();
  const copy = useMemo(() => getRealEstateCopy(language), [language]);
  return { copy, language };
}
