"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

const DISMISSED_KEY = "trefolio_secure_prompt_dismissed";

export default function SecureAccountPrompt() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  if (dismissed || !user) return null;

  const hasPasskey = (user.passkeyCount ?? 0) > 0;
  const hasGoogle = user.googleLinked || user.authProvider === "google";
  if (hasPasskey && hasGoogle) return null;

  return (
    <div className="card mb-4 border-emerald-500/18 bg-emerald-500/[0.06] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/14 bg-emerald-500/12">
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{t("secureAccountTitle")}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t("secureAccountDesc")}</p>
          <div className="flex items-center gap-2 mt-2.5">
            <a
              href="/profile"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-colors hover:text-emerald-800 dark:hover:text-emerald-200"
            >
              {t("secureAccountTitle")} &rarr;
            </a>
            <button
              onClick={() => { localStorage.setItem(DISMISSED_KEY, "1"); setDismissed(true); }}
              className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
            >
              {t("secureAccountDismiss")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
