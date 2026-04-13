// trefolio — Portfolio Widget for Scriptable (iOS)
// Paste this script in the Scriptable app, then add a Scriptable widget to your home screen.
// Set your widget token below (generate one at trefolio.com → Profile → Widget Access).
// Portfolio scope: Profile → Device & Widget (independent from the in-app portfolio picker).
// Display amounts use `currency`; totalValueEUR is a legacy JSON key (value is in that currency).

const TOKEN = "YOUR_TOKEN_HERE";
const API_URL = "https://trefolio.com/api/portfolio/summary";
const ICON_URL = "https://trefolio.com/favicon.png";
const APP_URL = "https://trefolio.com";
const REFRESH_MINUTES = 30;

const BG = new Color("#0f172a");
const TEXT = new Color("#f1f5f9");
const MUTED = new Color("#94a3b8");
const GREEN = new Color("#10b981");
const RED = new Color("#ef4444");
const CURRENCY_SYMBOLS = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CAD: "C$",
  DKK: "kr",
};

async function fetchData() {
  const req = new Request(API_URL);
  req.headers = { Authorization: `Bearer ${TOKEN}` };
  req.timeoutInterval = 15;
  const body = await req.loadString();
  const status = req.response.statusCode;
  if (status < 200 || status >= 300) {
    throw new Error(`HTTP ${status}`);
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
  return Math.abs(num(n)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sign(n) {
  return num(n) >= 0 ? "+" : "−";
}

function currencyCode(data) {
  return typeof data?.currency === "string" && data.currency.trim() ? data.currency.trim().toUpperCase() : "EUR";
}

function money(amount, data) {
  const code = currencyCode(data);
  const symbol = CURRENCY_SYMBOLS[code];
  if (symbol) return `${symbol}${fmt(amount)}`;
  return `${code} ${fmt(amount)}`;
}

function createSmallWidget(data, icon) {
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.setPadding(12, 14, 12, 14);
  w.url = APP_URL;

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

  if (data.portfolioName) {
    header.addSpacer(null);
    const pName = header.addText(data.portfolioName);
    pName.font = Font.regularSystemFont(8);
    pName.textColor = MUTED;
    pName.lineLimit = 1;
  }

  w.addSpacer(4);

  const value = w.addText(money(data.totalValueEUR, data));
  value.font = Font.boldSystemFont(22);
  value.textColor = TEXT;
  value.minimumScaleFactor = 0.6;

  w.addSpacer(2);

  const isUp = num(data.dayChangeEUR) >= 0;
  const change = w.addText(`${sign(data.dayChangeEUR)}${money(data.dayChangeEUR, data)} (${sign(data.dayChangePercent)}${Math.abs(num(data.dayChangePercent)).toFixed(2)}%)`);
  change.font = Font.mediumSystemFont(11);
  change.textColor = isUp ? GREEN : RED;

  w.addSpacer(4);

  const gainUp = num(data.totalGainLoss) >= 0;
  const pl = w.addText(`P/L ${sign(data.totalGainLoss)}${money(data.totalGainLoss, data)}`);
  pl.font = Font.regularSystemFont(10);
  pl.textColor = gainUp ? GREEN : RED;

  w.addSpacer(null);

  const footer = w.addText(`${data.holdingsCount} holdings · ${currencyCode(data)}`);
  footer.font = Font.regularSystemFont(8);
  footer.textColor = MUTED;

  return w;
}

function createMediumWidget(data, icon) {
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.setPadding(12, 14, 12, 14);
  w.url = APP_URL;

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

  if (data.portfolioName) {
    const pName = header.addText(data.portfolioName);
    pName.font = Font.regularSystemFont(9);
    pName.textColor = MUTED;
    pName.lineLimit = 1;
    header.addSpacer(6);
  }

  const count = header.addText(`${data.holdingsCount} holdings · ${currencyCode(data)}`);
  count.font = Font.regularSystemFont(9);
  count.textColor = MUTED;

  w.addSpacer(4);

  const value = w.addText(money(data.totalValueEUR, data));
  value.font = Font.boldSystemFont(26);
  value.textColor = TEXT;
  value.minimumScaleFactor = 0.6;

  const isUp = num(data.dayChangeEUR) >= 0;
  const changeLine = w.addStack();
  changeLine.layoutHorizontally();
  changeLine.centerAlignContent();
  changeLine.spacing = 6;

  const change = changeLine.addText(`${sign(data.dayChangeEUR)}${money(data.dayChangeEUR, data)}`);
  change.font = Font.semiboldSystemFont(12);
  change.textColor = isUp ? GREEN : RED;

  const pct = changeLine.addText(`(${sign(data.dayChangePercent)}${Math.abs(num(data.dayChangePercent)).toFixed(2)}%)`);
  pct.font = Font.regularSystemFont(11);
  pct.textColor = isUp ? GREEN : RED;

  const gainUp = num(data.totalGainLoss) >= 0;
  const plText = changeLine.addText(`  P/L ${sign(data.totalGainLoss)}${Math.abs(num(data.totalGainLossPercent)).toFixed(1)}%`);
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
      const dc = col.addText(`${sign(h.dayChange)}${Math.abs(num(h.dayChange)).toFixed(1)}%`);
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

await run();
