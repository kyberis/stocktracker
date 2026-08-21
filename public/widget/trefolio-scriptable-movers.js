// trefolio — Top Movers Widget for Scriptable (iOS)
// Paste this script in the Scriptable app, then add a Scriptable widget to your home screen.
// Shows the day's biggest movers: two gainers and one loser (by day %).
// Set your widget token below (generate one at trefolio.com → Profile → Widget Access).
// Portfolio scope: Profile → Device & Widget (independent from the in-app portfolio picker).

const TOKEN = "YOUR_TOKEN_HERE";
const API_URL = "https://trefolio.com/api/portfolio/summary?full=true";
const APP_URL = "https://trefolio.com";
const REFRESH_MINUTES = 30;
const ROW_COUNT = 3;
const GAINERS = 2;
const LOSERS = 1;

const BG = new Color("#1c1c1e");
const TEXT = new Color("#ffffff");
const MUTED = new Color("#8e8e93");
const SEP = new Color("#2c2c2e");
const GREEN = new Color("#34c759");
const RED = new Color("#ff3b30");

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

async function fetchSparklinePoints(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=5m&range=1d`;
    const req = new Request(url);
    req.timeoutInterval = 8;
    const json = await req.loadJSON();
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(closes)) return null;
    const points = closes.filter((v) => typeof v === "number" && isFinite(v));
    return points.length >= 2 ? points : null;
  } catch {
    return null;
  }
}

function num(v) {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

function pickTopMovers(holdings) {
  const withChange = (holdings || []).filter(
    (h) => typeof h.dayChange === "number" && isFinite(h.dayChange),
  );
  const byAbsDesc = (a, b) =>
    Math.abs(b.dayChange) - Math.abs(a.dayChange) || String(a.ticker).localeCompare(String(b.ticker));

  const gainers = withChange
    .filter((h) => h.dayChange > 0)
    .sort((a, b) => b.dayChange - a.dayChange || String(a.ticker).localeCompare(String(b.ticker)));
  const losers = withChange
    .filter((h) => h.dayChange < 0)
    .sort((a, b) => a.dayChange - b.dayChange || String(a.ticker).localeCompare(String(b.ticker)));

  const selected = [];
  const seen = new Set();
  for (const h of gainers.slice(0, GAINERS)) {
    selected.push(h);
    seen.add(h.ticker);
  }
  for (const h of losers.slice(0, LOSERS)) {
    if (selected.length >= ROW_COUNT) break;
    selected.push(h);
    seen.add(h.ticker);
  }
  if (selected.length < ROW_COUNT) {
    const rest = withChange.filter((h) => !seen.has(h.ticker)).sort(byAbsDesc);
    for (const h of rest) {
      if (selected.length >= ROW_COUNT) break;
      selected.push(h);
      seen.add(h.ticker);
    }
  }
  return selected.sort(byAbsDesc);
}

function currencyCode(data) {
  return typeof data?.currency === "string" && data.currency.trim()
    ? data.currency.trim().toUpperCase()
    : "EUR";
}

function priceLocale(code) {
  return code === "EUR" || code === "DKK" || code === "GBP" ? "de-DE" : "en-US";
}

function fmtPrice(n, code) {
  const v = num(n);
  const digits = Math.abs(v) >= 1000 ? 0 : 2;
  return v.toLocaleString(priceLocale(code), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(n) {
  const v = num(n);
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toLocaleString(priceLocale("EUR"), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function syntheticPoints(dayChange) {
  const end = 100 + num(dayChange);
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const wobble = Math.sin(t * Math.PI * 2) * Math.abs(dayChange) * 0.15;
    pts.push(100 + (end - 100) * t + wobble);
  }
  return pts;
}

function drawSparkline(points, isUp) {
  const width = 72;
  const height = 28;
  const dc = new DrawContext();
  dc.size = new Size(width, height);
  dc.opaque = false;
  dc.respectScreenScale = true;

  const color = isUp ? GREEN : RED;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 2;
  const baselineY = height - pad - ((points[0] - min) / range) * (height - pad * 2);

  const base = new Path();
  base.move(new Point(0, baselineY));
  base.addLine(new Point(width, baselineY));
  dc.setStrokeColor(new Color("#3a3a3c"));
  dc.setLineWidth(0.5);
  dc.addPath(base);
  dc.strokePath();

  const line = new Path();
  points.forEach((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - pad - ((p - min) / range) * (height - pad * 2);
    if (i === 0) line.move(new Point(x, y));
    else line.addLine(new Point(x, y));
  });
  dc.setStrokeColor(color);
  dc.setLineWidth(1.5);
  dc.addPath(line);
  dc.strokePath();

  return dc.getImage();
}

function addRow(parent, holding, sparkPoints, code, isLast) {
  const isUp = num(holding.dayChange) >= 0;
  const accent = isUp ? GREEN : RED;

  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.size = new Size(0, 44);

  const left = row.addStack();
  left.layoutVertically();
  left.size = new Size(110, 0);

  const titleRow = left.addStack();
  titleRow.layoutHorizontally();
  titleRow.centerAlignContent();
  titleRow.spacing = 4;

  const arrow = titleRow.addText(isUp ? "▲" : "▼");
  arrow.font = Font.boldSystemFont(9);
  arrow.textColor = accent;

  const ticker = titleRow.addText(String(holding.ticker || ""));
  ticker.font = Font.boldSystemFont(13);
  ticker.textColor = TEXT;
  ticker.lineLimit = 1;

  const name = left.addText(String(holding.name || holding.ticker || ""));
  name.font = Font.regularSystemFont(10);
  name.textColor = MUTED;
  name.lineLimit = 1;

  row.addSpacer(6);

  const points = sparkPoints && sparkPoints.length >= 2
    ? sparkPoints
    : syntheticPoints(holding.dayChange);
  const spark = row.addImage(drawSparkline(points, isUp));
  spark.imageSize = new Size(72, 28);

  row.addSpacer(null);

  const right = row.addStack();
  right.layoutVertically();
  right.size = new Size(78, 0);

  const price = right.addText(fmtPrice(holding.price, code));
  price.font = Font.semiboldSystemFont(14);
  price.textColor = TEXT;
  price.rightAlignText();
  price.lineLimit = 1;
  price.minimumScaleFactor = 0.7;

  const pct = right.addText(fmtPct(holding.dayChange));
  pct.font = Font.mediumSystemFont(11);
  pct.textColor = accent;
  pct.rightAlignText();

  if (!isLast) {
    parent.addSpacer(4);
    const line = parent.addStack();
    line.backgroundColor = SEP;
    line.size = new Size(0, 0.5);
    parent.addSpacer(4);
  }
}

function createMoversWidget(data, movers, sparklines) {
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.setPadding(12, 14, 12, 14);
  w.url = APP_URL;
  w.cornerRadius = 22;

  const code = currencyCode(data);
  const list = w.addStack();
  list.layoutVertically();

  if (movers.length === 0) {
    const empty = list.addText("No movers today");
    empty.font = Font.regularSystemFont(12);
    empty.textColor = MUTED;
    return w;
  }

  movers.forEach((h, i) => {
    addRow(list, h, sparklines[h.ticker], code, i === movers.length - 1);
  });

  return w;
}

function createErrorWidget(message) {
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.setPadding(12, 14, 12, 14);
  w.url = APP_URL;
  const err = w.addText("Unable to load movers");
  err.font = Font.regularSystemFont(12);
  err.textColor = RED;
  w.addSpacer(4);
  const hint = w.addText(String(message || "Check token"));
  hint.font = Font.regularSystemFont(8);
  hint.textColor = MUTED;
  return w;
}

async function run() {
  let data;
  try {
    data = await fetchData();
    if (data.error) throw new Error(data.error);
  } catch (e) {
    const w = createErrorWidget(e.message);
    w.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);
    if (config.runsInWidget) Script.setWidget(w);
    else w.presentMedium();
    Script.complete();
    return;
  }

  const movers = pickTopMovers(data.topHoldings || []).slice(0, ROW_COUNT);
  const sparkEntries = await Promise.all(
    movers.map(async (h) => [h.ticker, await fetchSparklinePoints(h.ticker)]),
  );
  const sparklines = Object.fromEntries(sparkEntries);

  const widget = createMoversWidget(data, movers, sparklines);
  widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    widget.presentMedium();
  }
  Script.complete();
}

await run();
