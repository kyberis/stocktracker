"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Copy,
  Check,
  Smartphone,
  Apple,
  MonitorSmartphone,
  RefreshCw,
  Trash2,
  KeyRound,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

type ScriptVariant = "portfolio" | "movers" | "byType";

const SCRIPT_VARIANTS: Record<
  ScriptVariant,
  { file: string; label: string; description: string; filename: string }
> = {
  portfolio: {
    file: "/widget/trefolio-scriptable.js",
    filename: "trefolio-scriptable.js",
    label: "Portfolio summary",
    description: "Total value, day change, and top holdings by weight.",
  },
  movers: {
    file: "/widget/trefolio-scriptable-movers.js",
    filename: "trefolio-scriptable-movers.js",
    label: "Top movers",
    description: "Biggest day moves — Large shows 4 up + 3 down (fills the other side if short).",
  },
  byType: {
    file: "/widget/trefolio-scriptable-by-type.js",
    filename: "trefolio-scriptable-by-type.js",
    label: "By asset type",
    description: "Value and day change per sleeve — Stocks, ETFs, Crypto, Funds, Fixed return.",
  },
};

function injectToken(script: string, token: string) {
  return script.replace(/YOUR_TOKEN_HERE/g, token || "YOUR_TOKEN_HERE");
}

export default function WidgetSetupPage() {
  return (
    <Suspense>
      <WidgetSetupContent />
    </Suspense>
  );
}

function WidgetSetupContent() {
  const searchParams = useSearchParams();
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<"ios" | "android">("ios");
  const [scriptVariant, setScriptVariant] = useState<ScriptVariant>("portfolio");
  const [scriptPreview, setScriptPreview] = useState("");
  const [scriptBody, setScriptBody] = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);
  const [widgetToken, setWidgetToken] = useState("");
  const [widgetHasToken, setWidgetHasToken] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setWidgetToken(tokenFromUrl);
      setWidgetHasToken(true);
    } else {
      fetch("/api/widget-token")
        .then((r) => r.json())
        .then((d) => setWidgetHasToken(!!d.hasToken))
        .catch(() => {});
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setScriptLoading(true);
    fetch(SCRIPT_VARIANTS[scriptVariant].file)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        setScriptBody(text);
        setScriptPreview(text.split("\n").slice(0, 9).join("\n"));
      })
      .catch(() => {
        if (cancelled) return;
        setScriptBody("");
        setScriptPreview("// Unable to load script preview");
      })
      .finally(() => {
        if (!cancelled) setScriptLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scriptVariant]);

  const handleGenerateToken = useCallback(async () => {
    setWidgetLoading(true);
    try {
      const res = await fetch("/api/widget-token", { method: "POST" });
      const data = await res.json();
      if (data.token) {
        setWidgetToken(data.token);
        setWidgetHasToken(true);
      }
    } catch { /* ignore */ }
    setWidgetLoading(false);
  }, []);

  const handleRevokeToken = useCallback(async () => {
    setWidgetLoading(true);
    try {
      await fetch("/api/widget-token", { method: "DELETE" });
      setWidgetHasToken(false);
      setWidgetToken("");
    } catch { /* ignore */ }
    setWidgetLoading(false);
  }, []);

  const handleCopyScript = async () => {
    let body = scriptBody;
    if (!body) {
      try {
        const res = await fetch(SCRIPT_VARIANTS[scriptVariant].file);
        if (!res.ok) return;
        body = await res.text();
        setScriptBody(body);
      } catch {
        return;
      }
    }
    const script = injectToken(body, widgetToken);
    navigator.clipboard.writeText(script).then(() => {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }).catch(() => {});
  };

  const variantMeta = SCRIPT_VARIANTS[scriptVariant];
  const previewText = injectToken(scriptPreview || "// Loading…", widgetToken);

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
        <div role="tablist" aria-label="Platform" className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
          <button
            role="tab"
            aria-selected={activeTab === "ios"}
            aria-controls="widget-tabpanel-ios"
            onClick={() => setActiveTab("ios")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "ios"
                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            }`}
          >
            <Apple className="w-4 h-4" aria-hidden="true" />
            iOS
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "android"}
            aria-controls="widget-tabpanel-android"
            onClick={() => setActiveTab("android")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "android"
                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            }`}
          >
            <MonitorSmartphone className="w-4 h-4" aria-hidden="true" />
            Android
          </button>
        </div>

        <div role="tabpanel" id={`widget-tabpanel-${activeTab}`}>
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

              {/* Token management */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Widget Token</span>
                </div>

                {widgetToken ? (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      Token ready &mdash; it&apos;s already embedded in the script below.
                    </p>
                    <code className="block text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-lg font-mono break-all">
                      {widgetToken}
                    </code>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {widgetHasToken ? (
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        A widget token is active. Generate a new one to get a copy-ready script, or revoke it.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Generate a token first so the script is ready to paste into Scriptable.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateToken}
                    disabled={widgetLoading}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${widgetLoading ? "animate-spin" : ""}`} />
                    {widgetHasToken ? "Regenerate Token" : "Generate Token"}
                  </button>
                  {widgetHasToken && (
                    <button
                      onClick={handleRevokeToken}
                      disabled={widgetLoading}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revoke
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Portfolio source</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  The widget uses your configured portfolio from Profile settings. Change it there anytime and the widget updates automatically.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Script version</span>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Scriptable widget version"
                  className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {(Object.keys(SCRIPT_VARIANTS) as ScriptVariant[]).map((key) => {
                    const meta = SCRIPT_VARIANTS[key];
                    const selected = scriptVariant === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setScriptVariant(key)}
                        className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                          selected
                            ? "border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/10"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{meta.label}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{meta.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <ol className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Generate a widget token above</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Install <strong>Scriptable</strong> from the App Store (free)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                  <span>
                    Choose a script version, then copy it below {widgetToken ? "(token is already included)" : ""} and paste it into a new Scriptable script
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">4</span>
                  <span>
                    Long-press your home screen &rarr; tap <strong>+</strong> &rarr; search <strong>Scriptable</strong> &rarr; choose{" "}
                    {scriptVariant === "movers" || scriptVariant === "byType" ? "Small, Medium, or Large" : "Small or Medium"} &rarr; select the script
                  </span>
                </li>
              </ol>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{variantMeta.filename}</span>
                  <button
                    onClick={handleCopyScript}
                    disabled={scriptLoading && !scriptBody}
                    className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedScript ? "Copied!" : widgetToken ? "Copy Script (with token)" : "Copy Script"}
                  </button>
                </div>
                <pre className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-400 font-mono overflow-x-auto max-h-40 scrollbar-thin">
                  {previewText}
                  {"\n// ..."}
                </pre>
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
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-center text-gray-400 dark:text-slate-500 leading-relaxed px-4">
          trefolio is not a financial advisor. Portfolio data is provided for informational purposes only.
          Widget data refreshes periodically and may be delayed. Past performance does not guarantee future results.
        </p>
      </div>
    </main>
  );
}
