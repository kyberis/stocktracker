"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Check, Smartphone, Apple, MonitorSmartphone, RefreshCw, Trash2, KeyRound } from "lucide-react";
import Link from "next/link";

const SCRIPT_URL = "https://trefolio.com/widget/trefolio-scriptable.js";

const SCRIPTABLE_TEMPLATE = `// trefolio — Portfolio Widget for Scriptable (iOS)
// Paste this script in the Scriptable app, then add a Scriptable widget to your home screen.

const TOKEN = "__TOKEN__";
const API_URL = "https://trefolio.com/api/portfolio/summary";
const ICON_URL = "https://trefolio.com/favicon.png";
const REFRESH_MINUTES = 30;

const BG = new Color("#0f172a");
const TEXT = new Color("#f1f5f9");
const MUTED = new Color("#94a3b8");
const GREEN = new Color("#10b981");
const RED = new Color("#ef4444");

async function fetchData() {
  const req = new Request(API_URL);
  req.headers = { Authorization: \`Bearer \${TOKEN}\` };
  req.timeoutInterval = 15;
  const body = await req.loadString();
  const status = req.response.statusCode;
  if (status < 200 || status >= 300) {
    throw new Error(\`HTTP \${status}\`);
  }
  return JSON.parse(body);
}

async function fetchIcon() {
  try {
    const req = new Request(ICON_URL);
    req.timeoutInterval = 10;
    return await req.loadImage();
  } catch {
    return null;
  }
}

function num(v) {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

function fmt(n) {
  return num(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sign(n) {
  return num(n) >= 0 ? "+" : "";
}

function createSmallWidget(data, icon) {
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.setPadding(12, 14, 12, 14);

  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  header.spacing = 4;

  if (icon) {
    const img = header.addImage(icon);
    img.imageSize = new Size(12, 12);
    img.cornerRadius = 3;
  }

  const title = header.addText("trefolio");
  title.font = Font.boldSystemFont(10);
  title.textColor = GREEN;

  w.addSpacer(4);

  const value = w.addText(\`€\${fmt(data.totalValueEUR)}\`);
  value.font = Font.boldSystemFont(22);
  value.textColor = TEXT;
  value.minimumScaleFactor = 0.6;

  w.addSpacer(2);

  const isUp = num(data.dayChangeEUR) >= 0;
  const change = w.addText(\`\${sign(data.dayChangeEUR)}€\${fmt(data.dayChangeEUR)} (\${sign(data.dayChangePercent)}\${num(data.dayChangePercent).toFixed(2)}%)\`);
  change.font = Font.mediumSystemFont(11);
  change.textColor = isUp ? GREEN : RED;

  w.addSpacer(4);

  const gainUp = num(data.totalGainLoss) >= 0;
  const pl = w.addText(\`P/L \${sign(data.totalGainLoss)}€\${fmt(data.totalGainLoss)}\`);
  pl.font = Font.regularSystemFont(10);
  pl.textColor = gainUp ? GREEN : RED;

  w.addSpacer(null);

  const footer = w.addText(\`\${data.holdingsCount} holdings\`);
  footer.font = Font.regularSystemFont(8);
  footer.textColor = MUTED;

  return w;
}

function createMediumWidget(data, icon) {
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.setPadding(12, 14, 12, 14);

  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  if (icon) {
    const img = header.addImage(icon);
    img.imageSize = new Size(12, 12);
    img.cornerRadius = 3;
  }

  header.addSpacer(4);

  const title = header.addText("trefolio");
  title.font = Font.boldSystemFont(10);
  title.textColor = GREEN;

  header.addSpacer();

  const count = header.addText(\`\${data.holdingsCount} holdings\`);
  count.font = Font.regularSystemFont(9);
  count.textColor = MUTED;

  w.addSpacer(4);

  const value = w.addText(\`€\${fmt(data.totalValueEUR)}\`);
  value.font = Font.boldSystemFont(26);
  value.textColor = TEXT;
  value.minimumScaleFactor = 0.6;

  const isUp = num(data.dayChangeEUR) >= 0;
  const changeLine = w.addStack();
  changeLine.layoutHorizontally();
  changeLine.centerAlignContent();
  changeLine.spacing = 6;

  const change = changeLine.addText(\`\${sign(data.dayChangeEUR)}€\${fmt(data.dayChangeEUR)}\`);
  change.font = Font.semiboldSystemFont(12);
  change.textColor = isUp ? GREEN : RED;

  const pct = changeLine.addText(\`(\${sign(data.dayChangePercent)}\${num(data.dayChangePercent).toFixed(2)}%)\`);
  pct.font = Font.regularSystemFont(11);
  pct.textColor = isUp ? GREEN : RED;

  const gainUp = num(data.totalGainLoss) >= 0;
  const plText = changeLine.addText(\`  P/L \${sign(data.totalGainLoss)}\${num(data.totalGainLossPercent).toFixed(1)}%\`);
  plText.font = Font.regularSystemFont(10);
  plText.textColor = gainUp ? GREEN : RED;

  w.addSpacer(8);

  if (data.topHoldings && data.topHoldings.length > 0) {
    const grid = w.addStack();
    grid.layoutHorizontally();
    grid.spacing = 0;

    for (const h of data.topHoldings.slice(0, 4)) {
      const col = grid.addStack();
      col.layoutVertically();
      col.size = new Size(0, 0);
      col.addSpacer(null);

      const ticker = col.addText(h.ticker);
      ticker.font = Font.semiboldSystemFont(10);
      ticker.textColor = TEXT;
      ticker.lineLimit = 1;

      const hUp = num(h.dayChange) >= 0;
      const dc = col.addText(\`\${sign(h.dayChange)}\${num(h.dayChange).toFixed(1)}%\`);
      dc.font = Font.mediumSystemFont(9);
      dc.textColor = hUp ? GREEN : RED;

      grid.addSpacer(null);
    }
  }

  return w;
}

async function run() {
  let data;
  let icon;
  try {
    [data, icon] = await Promise.all([fetchData(), fetchIcon()]);
    if (data.error) throw new Error(data.error);
  } catch (e) {
    const w = new ListWidget();
    w.backgroundColor = BG;
    w.setPadding(12, 14, 12, 14);
    const err = w.addText("Unable to load portfolio");
    err.font = Font.regularSystemFont(12);
    err.textColor = RED;
    w.addSpacer(4);
    const hint = w.addText(String(e.message || "Check token"));
    hint.font = Font.regularSystemFont(8);
    hint.textColor = MUTED;
    w.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);
    if (config.runsInWidget) {
      Script.setWidget(w);
    } else {
      w.presentSmall();
    }
    Script.complete();
    return;
  }

  const family = config.widgetFamily || "small";
  const widget = family === "medium" ? createMediumWidget(data, icon) : createSmallWidget(data, icon);

  widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    family === "medium" ? widget.presentMedium() : widget.presentSmall();
  }
  Script.complete();
}

await run();`;

function buildScript(token: string) {
  return SCRIPTABLE_TEMPLATE.replace("__TOKEN__", token || "YOUR_TOKEN_HERE");
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

  const handleCopyScript = () => {
    const script = buildScript(widgetToken);
    navigator.clipboard.writeText(script).then(() => {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }).catch(() => {});
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
                  <span>Copy the script below {widgetToken ? "(token is already included)" : ""} and paste it into a new Scriptable script</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">4</span>
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
                    {copiedScript ? "Copied!" : widgetToken ? "Copy Script (with token)" : "Copy Script"}
                  </button>
                </div>
                <pre className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-400 font-mono overflow-x-auto max-h-40 scrollbar-thin">
                  {buildScript(widgetToken).split("\n").slice(0, 8).join("\n")}
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

        {/* Disclaimer */}
        <p className="text-[10px] text-center text-gray-400 dark:text-slate-500 leading-relaxed px-4">
          trefolio is not a financial advisor. Portfolio data is provided for informational purposes only.
          Widget data refreshes periodically and may be delayed.
        </p>
      </div>
    </main>
  );
}
