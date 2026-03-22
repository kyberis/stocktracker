"use client";

import { useEffect } from "react";

function isChunkError(error: Error): boolean {
  return error.name === "ChunkLoadError" || error.message?.includes("Loading chunk");
}

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isStale = isChunkError(error);

  useEffect(() => {
    if (isStale) {
      window.location.reload();
    }
  }, [isStale]);

  return (
    <main className="px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {isStale ? "New version available" : "Something went wrong"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {isStale
            ? "A new version of trefolio was deployed. Reloading..."
            : "An unexpected error occurred. Please try again or return to the dashboard."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={isStale ? () => window.location.reload() : reset}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
          >
            {isStale ? "Reload now" : "Try again"}
          </button>
          {!isStale && (
            <a
              href="/"
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              Go to dashboard
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
