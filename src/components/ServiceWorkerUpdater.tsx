"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export default function ServiceWorkerUpdater() {
  const [updateReady, setUpdateReady] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    function onStateChange(this: ServiceWorker) {
      if (this.state === "installed" && navigator.serviceWorker.controller) {
        waitingWorkerRef.current = this;
        setUpdateReady(true);
      }
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;

        if (reg.waiting && navigator.serviceWorker.controller) {
          waitingWorkerRef.current = reg.waiting;
          setUpdateReady(true);
          return;
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", onStateChange);
        });
      })
      .catch(() => {});

    return () => {
      if (registration?.installing) {
        registration.installing.removeEventListener("statechange", onStateChange);
      }
    };
  }, []);

  const handleUpdate = useCallback(() => {
    const waiting = waitingWorkerRef.current;
    if (!waiting) return;
    waiting.postMessage({ type: "SKIP_WAITING" });
    setUpdateReady(false);
    window.location.reload();
  }, []);

  if (!updateReady) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-16 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm">New version available</p>
          <p className="text-slate-400 text-xs">Refresh to get the latest trefolio.</p>
        </div>
        <button
          onClick={handleUpdate}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
