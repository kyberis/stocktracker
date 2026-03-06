import type { Language } from "./types";

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "cs", name: "Czech", nativeName: "Čeština" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar" },
  { code: "ro", name: "Romanian", nativeName: "Română" },
  { code: "bg", name: "Bulgarian", nativeName: "Български" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski" },
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "da", name: "Danish", nativeName: "Dansk" },
  { code: "fi", name: "Finnish", nativeName: "Suomi" },
  { code: "et", name: "Estonian", nativeName: "Eesti" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių" },
  { code: "ga", name: "Irish", nativeName: "Gaeilge" },
  { code: "mt", name: "Maltese", nativeName: "Malti" },
  { code: "nb", name: "Norwegian", nativeName: "Norsk bokmål" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "sr", name: "Serbian", nativeName: "Српски" },
  { code: "is", name: "Icelandic", nativeName: "Íslenska" },
  { code: "sq", name: "Albanian", nativeName: "Shqip" },
  { code: "bs", name: "Bosnian", nativeName: "Bosanski" },
  { code: "mk", name: "Macedonian", nativeName: "Македонски" },
  { code: "be", name: "Belarusian", nativeName: "Беларуская" },
  { code: "ca", name: "Catalan", nativeName: "Català" },
  { code: "cy", name: "Welsh", nativeName: "Cymraeg" },
];

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as [Language, ...Language[]];

const languageMap = new Map(SUPPORTED_LANGUAGES.map((l) => [l.code, l]));

export function isValidLanguage(code: string): code is Language {
  return languageMap.has(code as Language);
}

export function languageCodeToName(code: string): string {
  return languageMap.get(code as Language)?.name ?? "English";
}

export function languageCodeToNativeName(code: string): string {
  return languageMap.get(code as Language)?.nativeName ?? "English";
}
