"use client";

import { useI18n } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
      <button
        onClick={() => setLanguage("en")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          language === "en"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("es")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          language === "es"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        ES
      </button>
    </div>
  );
}
