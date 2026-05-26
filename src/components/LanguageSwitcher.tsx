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
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Language: ${current?.name ?? language}`}
        className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-sm font-medium text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-highlight)]"
        style={{ background: "var(--surface-soft)" }}
      >
        <span className="uppercase text-xs font-bold text-emerald-600 dark:text-emerald-400" aria-hidden="true">{language}</span>
        <span className="hidden lg:inline truncate max-w-[100px]">{current?.nativeName}</span>
        <svg className="w-3.5 h-3.5 text-gray-400 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d={open ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
        </svg>
      </button>

      {open && (
        <div className="glass-overlay absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-[18px] border border-[color:var(--border)] shadow-xl">
          <div className="border-b border-[color:var(--border)] p-2">
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search language..."
              aria-label="Search language"
              className="w-full rounded-xl border border-[color:var(--border)] px-2.5 py-1.5 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted)] focus:outline-none focus:border-emerald-500"
              style={{ background: "var(--surface-soft)" }}
            />
          </div>
          <div className="max-h-64 overflow-y-auto" role="listbox" aria-label="Languages">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-[color:var(--muted)]" role="status">No match</div>
            )}
            {filtered.map((l) => (
              <button
                key={l.code}
                role="option"
                aria-selected={l.code === language}
                onClick={() => pick(l.code)}
                className={`flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-[color:var(--surface-soft)] ${
                  l.code === language ? "bg-emerald-500/12 text-emerald-400" : "text-[color:var(--foreground)]"
                }`}
              >
                <span className="w-6 text-center text-xs font-bold uppercase text-[color:var(--muted)]" aria-hidden="true">{l.code}</span>
                <span className="truncate">{l.nativeName}</span>
                {l.code === language && (
                  <svg className="w-4 h-4 ml-auto text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
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
