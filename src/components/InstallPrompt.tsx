"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X, Share } from "lucide-react";
import { isNativePlatform } from "@/lib/capacitor";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "trefolio_install_dismissed";

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Record<string, unknown>).standalone === true)
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone() || isNativePlatform()) return;
    const prev = localStorage.getItem(DISMISS_KEY);
    if (prev) {
      const ts = parseInt(prev, 10);
      if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return;
    }
    setDismissed(false);

    if (isIOS()) {
      setShowIOSTip(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDismissed(true);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }, []);

  if (dismissed || (!deferredPrompt && !showIOSTip)) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-slate-400 hover:text-white p-1"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {showIOSTip ? (
        <div className="pr-6">
          <p className="text-white font-medium text-sm mb-1">Install trefolio</p>
          <p className="text-slate-300 text-xs leading-relaxed">
            Tap <Share className="inline w-3.5 h-3.5 -mt-0.5 text-emerald-400" /> in
            Safari, then <strong>&quot;Add to Home Screen&quot;</strong>.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 pr-6">
          <div className="flex-1">
            <p className="text-white font-medium text-sm">Install trefolio</p>
            <p className="text-slate-400 text-xs">Add to your home screen</p>
          </div>
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Install
          </button>
        </div>
      )}
    </div>
  );
}
