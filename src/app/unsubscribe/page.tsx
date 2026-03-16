"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function UnsubscribePage() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    fetch(`/api/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setStatus(res.ok ? "success" : "error");
      })
      .catch(() => {
        setStatus("error");
      });
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <span className="text-emerald-500 font-extrabold text-lg">t</span>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">trefolio</span>
        </Link>

        <div className="card p-8">
          {status === "loading" && (
            <div className="space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full border-2 border-gray-200 dark:border-slate-600 border-t-indigo-500 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-slate-400">Processing your request...</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Unsubscribed</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                You have been unsubscribed from email notifications. You can re-enable them anytime from your profile settings.
              </p>
              <Link href="/" className="inline-block mt-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors">
                Go to trefolio
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Invalid Link</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                This unsubscribe link is invalid or has expired. You can manage your notification preferences from your profile settings.
              </p>
              <Link href="/" className="inline-block mt-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors">
                Go to trefolio
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
