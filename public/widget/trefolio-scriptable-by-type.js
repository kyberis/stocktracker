// trefolio — Asset Type Breakdown Widget for Scriptable (iOS)
// Paste this script in the Scriptable app, then add a Scriptable widget to your home screen.
// Shows portfolio value and day change per asset type (Stocks, ETFs, Crypto, etc.).
// Adapts layout for Small / Medium / Large widget sizes (config.widgetFamily).
// Set your widget token below (generate one at trefolio.com → Profile → Widget Access).
// Portfolio scope: Profile → Device & Widget (independent from the in-app portfolio picker).

const TOKEN = "YOUR_TOKEN_HERE";
const API_URL = "https://trefolio.com/api/portfolio/summary";
const APP_URL = "https://trefolio.com";
const REFRESH_MINUTES = 30;

const BG = new Color("#0f172a");
const TEXT = new Color("#f1f5f9");
const MUTED = new Color("#94a3b8");
const SEP = new Color("#334155");
const GREEN = new Color("#10b981");
const RED = new Color("#ef4444");

const CURRENCY_SYMBOLS = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CAD: "C$",
  DKK: "kr",
};

const TYPE_LABELS = {
  stock: "Stocks",
  etf: "ETFs",
  fund: "Funds",
  crypto: "Crypto",
  fixed_return: "Fixed",
};

const TYPE_COLORS = {
  stock: new Color("#6366f1"),
  etf: new Color("#f59e0b"),
  fund: new Color("#14b8a6"),
  crypto: new Color("#ec4899"),
  fixed_return: new Color("#0ea5e9"),
};

/** @returns {"small"|"medium"|"large"} */
function widgetFamily() {
  const f = config.widgetFamily;
  if (f === "small" || f === "medium" || f === "large") return f;
  return "medium";
}

function layoutFor(family) {
  if (family === "small") {
    return { family, rows: 2, padding: 10, showAlloc: false, showDayAbs: false, labelFont: 10, valueFont: 10, pctFont: 9, headerFont: 9, totalFont: 18 };
  }
  if (family === "large") {
    return { family, rows: 5, padding: 12, showAlloc: true, showDayAbs: true, labelFont: 12, valueFont: 12, pctFont: 11, headerFont: 10, totalFont: 22 };
  }
  return { family: "medium", rows: 4, padding: 12, showAlloc: false, showDayAbs: false, labelFont: 11, valueFont: 11, pctFont: 10, headerFont: 10, totalFont: 20 };
}

async function fetchData() {
  const req = new Request(API_URL);
  req.headers = { Authorization: `Bearer ${String(TOKEN).trim()}` };
  req.timeoutInterval = 15;
  const body = await req.loadString();
  const status = req.response.statusCode;
  if (status < 200 || status >= 300) {
    let detail = `HTTP ${status}`;
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.error === "string" && parsed.error) {
        detail = `${detail}: ${parsed.error}`;
      } else if (parsed?.reason === "rate_limited") {
        detail = `${detail}: rate limited — wait a few minutes`;
      }
    } catch {
      /* non-JSON body */
    }
    if (status === 401) {
      detail = `${detail} — regenerate token at trefolio.com → Profile → Widget Access`;
    }
    throw new Error(detail);
  }
  return JSON.parse(body);
}

function num(v) {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

function fmt(n) {
  return Math.abs(num(n)).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtCompact(n) {
  const abs = Math.abs(num(n));
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${Math.round(abs / 1000)}k`;
  return fmt(n);
}

function sign(n) {
  return num(n) >= 0 ? "+" : "−";
}

function currencyCode(data) {
  return typeof data?.currency === "string" && data.currency.trim() ? data.currency.trim().toUpperCase() : "EUR";
}

function money(amount, data, compact) {
  const code = currencyCode(data);
  const symbol = CURRENCY_SYMBOLS[code];
  const formatted = compact ? fmtCompact(amount) : fmt(amount);
  if (symbol) return `${symbol}${formatted}`;
  return `${code} ${formatted}`;
}

function typeLabel(key) {
  return TYPE_LABELS[key] || key;
}

function typeColor(key) {
  return TYPE_COLORS[key] || MUTED;
}

function activeTypes(data) {
  const rows = Array.isArray(data?.byAssetType) ? data.byAssetType : [];
  return rows.filter((r) => r && num(r.value) > 0);
}

function addHeader(w, data, layout) {
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const title = header.addText("trefolio");
  title.font = Font.boldSystemFont(layout.headerFont);
  title.textColor = GREEN;

  header.addSpacer(4);

  const sub = header.addText("By asset type");
  sub.font = Font.regularSystemFont(layout.headerFont - 1);
  sub.textColor = MUTED;

  header.addSpacer();

  if (data.portfolioName) {
    const pName = header.addText(data.portfolioName);
    pName.font = Font.regularSystemFont(layout.headerFont - 1);
    pName.textColor = MUTED;
    pName.lineLimit = 1;
  }
}

function addTotalRow(w, data, layout) {
  w.addSpacer(4);
  const totalStack = w.addStack();
  totalStack.layoutHorizontally();
  totalStack.centerAlignContent();

  const value = totalStack.addText(money(data.totalValueEUR, data, layout.family === "small"));
  value.font = Font.boldSystemFont(layout.totalFont);
  value.textColor = TEXT;
  value.minimumScaleFactor = 0.6;

  totalStack.addSpacer();

  const isUp = num(data.dayChangeEUR) >= 0;
  const dayPct = totalStack.addText(`${sign(data.dayChangePercent)}${Math.abs(num(data.dayChangePercent)).toFixed(1)}%`);
  dayPct.font = Font.semiboldSystemFont(layout.pctFont + 1);
  dayPct.textColor = isUp ? GREEN : RED;
}

function addTypeRow(parent, row, data, layout) {
  const line = parent.addStack();
  line.layoutHorizontally();
  line.centerAlignContent();
  line.spacing = 6;

  const left = line.addStack();
  left.layoutHorizontally();
  left.centerAlignContent();
  left.spacing = 5;

  const dot = left.addStack();
  dot.size = new Size(6, 6);
  dot.backgroundColor = typeColor(row.key);
  dot.cornerRadius = 3;

  const label = left.addText(typeLabel(row.key));
  label.font = Font.semiboldSystemFont(layout.labelFont);
  label.textColor = TEXT;
  label.lineLimit = 1;

  if (layout.showAlloc && num(row.allocationPercent) > 0) {
    const alloc = left.addText(`${Math.round(num(row.allocationPercent))}%`);
    alloc.font = Font.regularSystemFont(layout.labelFont - 2);
    alloc.textColor = MUTED;
  }

  line.addSpacer();

  const value = line.addText(money(row.value, data, layout.family === "small"));
  value.font = Font.mediumSystemFont(layout.valueFont);
  value.textColor = TEXT;
  value.lineLimit = 1;

  const isUp = num(row.dayChangePercent) >= 0;
  const pct = line.addText(`${sign(row.dayChangePercent)}${Math.abs(num(row.dayChangePercent)).toFixed(1)}%`);
  pct.font = Font.semiboldSystemFont(layout.pctFont);
  pct.textColor = isUp ? GREEN : RED;

  if (layout.showDayAbs) {
    const abs = line.addText(`${sign(row.dayChange)}${money(row.dayChange, data, true)}`);
    abs.font = Font.regularSystemFont(layout.pctFont - 1);
    abs.textColor = isUp ? GREEN : RED;
  }
}

function createWidget(data, layout) {
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.setPadding(layout.padding, layout.padding + 2, layout.padding, layout.padding + 2);
  w.url = APP_URL;

  addHeader(w, data, layout);
  addTotalRow(w, data, layout);

  const types = activeTypes(data);
  if (types.length === 0) {
    w.addSpacer(6);
    const empty = w.addText("No asset types yet");
    empty.font = Font.regularSystemFont(10);
    empty.textColor = MUTED;
    return w;
  }

  w.addSpacer(6);
  const list = w.addStack();
  list.layoutVertically();
  list.spacing = layout.family === "small" ? 4 : 5;

  for (const row of types.slice(0, layout.rows)) {
    addTypeRow(list, row, data, layout);
    if (row !== types.slice(0, layout.rows)[types.slice(0, layout.rows).length - 1]) {
      const sep = list.addStack();
      sep.size = new Size(0, 1);
      sep.backgroundColor = SEP;
    }
  }

  w.addSpacer(null);

  const footer = w.addText(`${currencyCode(data)} · ${types.length} types`);
  footer.font = Font.regularSystemFont(8);
  footer.textColor = MUTED;

  return w;
}

async function run() {
  const layout = layoutFor(widgetFamily());
  let data;
  try {
    data = await fetchData();
    if (data.error) throw new Error(data.error);
  } catch (e) {
    const w = new ListWidget();
    w.backgroundColor = BG;
    w.setPadding(12, 14, 12, 14);
    w.url = APP_URL;
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
    } else if (layout.family === "large") {
      w.presentLarge();
    } else if (layout.family === "medium") {
      w.presentMedium();
    } else {
      w.presentSmall();
    }
    Script.complete();
    return;
  }

  const widget = createWidget(data, layout);
  widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else if (layout.family === "large") {
    widget.presentLarge();
  } else if (layout.family === "medium") {
    widget.presentMedium();
  } else {
    widget.presentSmall();
  }
  Script.complete();
}

await run();
