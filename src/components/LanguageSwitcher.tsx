"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import type { Language } from "@/lib/types";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === language);

  const filtered = filter
    ? SUPPORTED_LANGUAGES.filter(
        (l) =>
          l.nativeName.toLowerCase().includes(filter.toLowerCase()) ||
          l.name.toLowerCase().includes(filter.toLowerCase()) ||
          l.code.toLowerCase().includes(filter.toLowerCase())
      )
    : SUPPORTED_LANGUAGES;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFilter("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  function pick(code: Language) {
    setLanguage(code);
    setOpen(false);
    setFilter("");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
      >
        <span className="uppercase text-xs font-bold text-emerald-400">{language}</span>
        <span className="hidden lg:inline truncate max-w-[100px]">{current?.nativeName}</span>
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={open ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search language..."
              className="w-full px-2.5 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">No match</div>
            )}
            {filtered.map((l) => (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                  l.code === language ? "bg-slate-700/50 text-emerald-400" : "text-slate-300"
                }`}
              >
                <span className="uppercase text-xs font-bold w-6 text-center text-slate-500">{l.code}</span>
                <span className="truncate">{l.nativeName}</span>
                {l.code === language && (
                  <svg className="w-4 h-4 ml-auto text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
