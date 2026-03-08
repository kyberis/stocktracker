"use client";

import { useEffect, useState } from "react";
import { releaseNotes, CURRENT_VERSION, type ChangeType } from "@/lib/release-notes";
import { useI18n } from "@/lib/i18n";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const SEEN_VERSION_KEY = "trefolio_seen_version";

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function changeIcon(type: ChangeType) {
  switch (type) {
    case "feature":
      return (
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
          <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </span>
      );
    case "improvement":
      return (
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
          <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </span>
      );
    case "fix":
      return (
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
          <svg className="w-3 h-3 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.59-5.59a1.5 1.5 0 112.12-2.12l4.47 4.47 7.07-7.07a1.5 1.5 0 112.12 2.12l-8.18 8.18a1.5 1.5 0 01-2.12.01z" />
          </svg>
        </span>
      );
  }
}

const changeLabelTranslations: Record<ChangeType, Record<string, string>> = {
  feature: { en: "New", es: "Nuevo", fr: "Nouveau", de: "Neu", it: "Nuovo", pt: "Novo" },
  improvement: { en: "Improved", es: "Mejora", fr: "Amélioré", de: "Verbessert", it: "Migliorato", pt: "Melhorado" },
  fix: { en: "Fixed", es: "Corrección", fr: "Corrigé", de: "Behoben", it: "Corretto", pt: "Corrigido" },
};

function changeLabel(type: ChangeType, lang: string) {
  return changeLabelTranslations[type][lang] || changeLabelTranslations[type].en;
}

function changeLabelColor(type: ChangeType) {
  switch (type) {
    case "feature":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
    case "improvement":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";
    case "fix":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
  }
}

export function useWhatsNewAutoShow() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_VERSION_KEY);
      if (seen !== CURRENT_VERSION) {
        setShow(true);
      }
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(SEEN_VERSION_KEY, CURRENT_VERSION);
    } catch {
      // ignore
    }
  };

  return { showWhatsNew: show, dismissWhatsNew: dismiss };
}

export default function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  const { language } = useI18n();
  const lang = language;

  const handleClose = () => {
    try {
      localStorage.setItem(SEEN_VERSION_KEY, CURRENT_VERSION);
    } catch {
      // ignore
    }
    onClose();
  };

  const focusTrapRef = useFocusTrap(isOpen, handleClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div ref={focusTrapRef} role="dialog" aria-modal="true" aria-labelledby="whatsnew-modal-title" className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-lg mx-4 shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 id="whatsnew-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                {lang !== "en" ? "Novedades" : "What's New"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {"Latest updates and improvements"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Release entries */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {releaseNotes.map((release, idx) => (
            <div key={release.version}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  v{release.version}
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {new Date(release.date).toLocaleDateString(lang !== "en" ? `${lang}` : "en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {idx === 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20">
                    LATEST
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {release.titleTranslations?.[lang] || release.title}
              </h3>
              <ul className="space-y-2">
                {release.changes.map((change, changeIdx) => (
                  <li key={changeIdx} className="flex items-start gap-2.5">
                    {changeIcon(change.type)}
                    <div className="flex-1 min-w-0">
                      <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mr-1.5 ${changeLabelColor(change.type)}`}>
                        {changeLabel(change.type, lang)}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-slate-300">
                        {change.translations?.[lang] || change.text}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              {idx < releaseNotes.length - 1 && (
                <div className="mt-4 border-t border-gray-100 dark:border-slate-700/50" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={handleClose}
            className="btn-primary text-sm px-5"
          >
            {"Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
