"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CONSENT_KEY = "trefolio_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(CONSENT_KEY, "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] p-4 sm:p-6 pointer-events-none">
      <div className="max-w-2xl mx-auto pointer-events-auto rounded-2xl bg-slate-900 border border-slate-700/60 shadow-2xl shadow-black/40 backdrop-blur-md px-6 py-5 animate-slide-up">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200 leading-relaxed">
              We use <strong className="text-white">essential cookies only</strong> to
              keep you logged in. No tracking or advertising cookies.{" "}
              <Link
                href="/privacy#cookies"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
              >
                Learn more
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={reject}
              className="text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg transition-colors"
            >
              Reject
            </button>
            <button
              onClick={accept}
              className="text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg transition-colors shadow-sm"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
