import type en from "./en";

export type TranslationStrings = Record<string, string>;

export type TranslationKey = keyof typeof en;
