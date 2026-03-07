"use client";

import { useState } from "react";
import { Copy, Check, Smartphone, Apple, MonitorSmartphone } from "lucide-react";
import Link from "next/link";

const SCRIPT_URL = "https://trefolio.com/widget/trefolio-scriptable.js";

export default function WidgetSetupPage() {
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<"ios" | "android">("ios");

  const handleCopyScript = async () => {
    try {
      const res = await fetch("/widget/trefolio-scriptable.js");
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <main className="px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link href="/profile" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline mb-2 inline-block">
            &larr; Back to Profile
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-emerald-500" />
            Widget Setup
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Get your portfolio on your home screen without a native app.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("ios")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "ios"
                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            }`}
          >
            <Apple className="w-4 h-4" />
            iOS
          </button>
          <button
            onClick={() => setActiveTab("android")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "android"
                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            }`}
          >
            <MonitorSmartphone className="w-4 h-4" />
            Android
          </button>
        </div>

        {activeTab === "ios" ? (
          <>
            {/* iOS PWA */}
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                1. Install the App (PWA)
              </h2>
              <ol className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Open <strong>trefolio.com</strong> in Safari</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Tap the <strong>Share</strong> button (square with arrow)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">4</span>
                  <span>Tap <strong>Add</strong> &mdash; trefolio now opens like a native app</span>
                </li>
              </ol>
            </div>

            {/* iOS Widget via Scriptable */}
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                2. Home Screen Widget (Scriptable)
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Use the free <a href="https://apps.apple.com/app/scriptable/id1405459188" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 underline">Scriptable</a> app to display a live portfolio widget on your home screen.
              </p>

              <ol className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">1</span>
                  <span>
                    <Link href="/profile" className="text-emerald-600 dark:text-emerald-400 underline">Generate a Widget Token</Link> from your profile
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Install <strong>Scriptable</strong> from the App Store (free)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Copy the widget script below and paste it into a new Scriptable script</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">4</span>
                  <span>Replace <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">YOUR_TOKEN_HERE</code> with your widget token</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">5</span>
                  <span>Long-press your home screen &rarr; tap <strong>+</strong> &rarr; search <strong>Scriptable</strong> &rarr; choose Small or Medium &rarr; select the script</span>
                </li>
              </ol>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">trefolio-scriptable.js</span>
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedScript ? "Copied" : "Copy Script"}
                  </button>
                </div>
                <a
                  href={SCRIPT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline break-all"
                >
                  {SCRIPT_URL}
                </a>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Android PWA */}
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                1. Install the App (PWA)
              </h2>
              <ol className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Open <strong>trefolio.com</strong> in Chrome</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Tap the <strong>Install</strong> banner that appears, or tap the <strong>three-dot menu</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">4</span>
                  <span>trefolio will appear on your home screen and open full-screen like a native app</span>
                </li>
              </ol>
            </div>

            {/* Android Shortcut Widget */}
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                2. Quick Access Shortcut
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                After installing the PWA, long-press the trefolio icon on your home screen to access shortcuts for Portfolio, Dividends, and the Widget view.
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                You can also open the <Link href="/widget" className="text-emerald-600 dark:text-emerald-400 underline">Widget View</Link> directly for a compact portfolio summary that auto-refreshes.
              </p>
            </div>
          </>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-center text-gray-400 dark:text-slate-500 leading-relaxed px-4">
          trefolio is not a financial advisor. Portfolio data is provided for informational purposes only.
          Widget data refreshes periodically and may be delayed.
        </p>
      </div>
    </main>
  );
}
