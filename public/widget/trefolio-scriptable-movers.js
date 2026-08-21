// trefolio — Top Movers Widget for Scriptable (iOS)
// Paste this script in the Scriptable app, then add a Scriptable widget to your home screen.
// Shows the day's biggest movers by day % (fills from the other side if short).
// Adapts layout for Small / Medium / Large widget sizes (config.widgetFamily).
// Set your widget token below (generate one at trefolio.com → Profile → Widget Access).
// Portfolio scope: Profile → Device & Widget (independent from the in-app portfolio picker).

const TOKEN = "YOUR_TOKEN_HERE";
const API_URL = "https://trefolio.com/api/portfolio/summary?full=true";
const APP_URL = "https://trefolio.com";
const REFRESH_MINUTES = 30;

const BG = new Color("#1c1c1e");
const TEXT = new Color("#ffffff");
const MUTED = new Color("#8e8e93");
const SEP = new Color("#2c2c2e");
const GREEN = new Color("#34c759");
const RED = new Color("#ff3b30");

/** @returns {"small"|"medium"|"large"} */
function widgetFamily() {
  const f = config.widgetFamily;
  if (f === "small" || f === "medium" || f === "large") return f;
  return "medium";
}

/**
 * Size-aware layout. Small drops the company name and shrinks type/spark
 * so ticker + spark + price fit; large shows more rows.
 */
function layoutFor(family) {
  if (family === "small") {
    return {
      family,
      rows: 3,
      gainers: 2,
      losers: 1,
      padding: 8,
      showName: false,
      showSpark: true,
      sparkW: 34,
      sparkH: 14,
      gap: 4,
      sepGap: 2,
      tickerFont: 11,
      nameFont: 9,
      priceFont: 11,
      pctFont: 9,
      arrowFont: 8,
      sparkStroke: 1.2,
      corner: 18,
    };
  }
  if (family === "large") {
    return {
      family,
      rows: 7,
      gainers: 4,
      losers: 3,
      padding: 12,
      showName: true,
      showSpark: true,
      sparkW: 80,
      sparkH: 22,
      gap: 5,
      sepGap: 3,
      tickerFont: 14,
      nameFont: 10,
      priceFont: 14,
      pctFont: 11,
      arrowFont: 9,
      sparkStroke: 1.4,
      corner: 24,
    };
  }
  return {
    family: "medium",
    rows: 3,
    gainers: 2,
    losers: 1,
    padding: 12,
    showName: true,
    showSpark: true,
    sparkW: 72,
    sparkH: 26,
    gap: 6,
    sepGap: 4,
    tickerFont: 13,
    nameFont: 10,
    priceFont: 14,
    pctFont: 11,
    arrowFont: 9,
    sparkStroke: 1.5,
    corner: 22,
  };
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
      /* non-JSON body (e.g. CDN challenge) */
    }
    if (status === 401) {
      detail = `${detail} — regenerate token at trefolio.com → Profile → Widget Access`;
    }
    throw new Error(detail);
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

function pickTopMovers(holdings, gainersWanted, losersWanted, totalWanted) {
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
  for (const h of gainers.slice(0, gainersWanted)) {
    selected.push(h);
    seen.add(h.ticker);
  }
  for (const h of losers.slice(0, losersWanted)) {
    if (selected.length >= totalWanted) break;
    selected.push(h);
    seen.add(h.ticker);
  }
  if (selected.length < totalWanted) {
    const rest = withChange.filter((h) => !seen.has(h.ticker)).sort(byAbsDesc);
    for (const h of rest) {
      if (selected.length >= totalWanted) break;
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

function drawSparkline(points, isUp, width, height, strokeWidth) {
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
  dc.setLineWidth(strokeWidth);
  dc.addPath(line);
  dc.strokePath();

  return dc.getImage();
}

function addRow(parent, holding, sparkPoints, code, layout, isLast) {
  const isUp = num(holding.dayChange) >= 0;
  const accent = isUp ? GREEN : RED;

  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  // Left: ticker (+ optional name). Natural width — no fixed Size (clips on small).
  const left = row.addStack();
  left.layoutVertically();
  left.centerAlignContent();

  const titleRow = left.addStack();
  titleRow.layoutHorizontally();
  titleRow.centerAlignContent();
  titleRow.spacing = layout.family === "small" ? 2 : 4;

  const arrow = titleRow.addText(isUp ? "▲" : "▼");
  arrow.font = Font.boldSystemFont(layout.arrowFont);
  arrow.textColor = accent;

  const ticker = titleRow.addText(String(holding.ticker || ""));
  ticker.font = Font.boldSystemFont(layout.tickerFont);
  ticker.textColor = TEXT;
  ticker.lineLimit = 1;
  ticker.minimumScaleFactor = 0.6;

  if (layout.showName) {
    const name = left.addText(String(holding.name || holding.ticker || ""));
    name.font = Font.regularSystemFont(layout.nameFont);
    name.textColor = MUTED;
    name.lineLimit = 1;
    name.minimumScaleFactor = 0.65;
  }

  row.addSpacer(layout.gap);

  if (layout.showSpark) {
    const points = sparkPoints && sparkPoints.length >= 2
      ? sparkPoints
      : syntheticPoints(holding.dayChange);
    const spark = row.addImage(
      drawSparkline(points, isUp, layout.sparkW, layout.sparkH, layout.sparkStroke),
    );
    spark.imageSize = new Size(layout.sparkW, layout.sparkH);
    spark.resizable = false;
    row.addSpacer(layout.gap);
  }

  // Flexible middle spacer pushes price to the trailing edge.
  row.addSpacer(null);

  const right = row.addStack();
  right.layoutVertically();
  right.centerAlignContent();

  const price = right.addText(fmtPrice(holding.price, code));
  price.font = Font.semiboldSystemFont(layout.priceFont);
  price.textColor = TEXT;
  price.rightAlignText();
  price.lineLimit = 1;
  price.minimumScaleFactor = 0.55;

  const pct = right.addText(fmtPct(holding.dayChange));
  pct.font = Font.mediumSystemFont(layout.pctFont);
  pct.textColor = accent;
  pct.rightAlignText();
  pct.lineLimit = 1;
  pct.minimumScaleFactor = 0.55;

  if (!isLast) {
    parent.addSpacer(layout.sepGap);
    const line = parent.addStack();
    line.backgroundColor = SEP;
    line.size = new Size(0, 0.5);
    parent.addSpacer(layout.sepGap);
  }
}

function createMoversWidget(data, movers, sparklines, layout) {
  const w = new ListWidget();
  w.backgroundColor = BG;
  const p = layout.padding;
  w.setPadding(p, p, p, p);
  w.url = APP_URL;
  w.cornerRadius = layout.corner;

  const code = currencyCode(data);
  const list = w.addStack();
  list.layoutVertically();
  list.topAlignContent();

  if (movers.length === 0) {
    const empty = list.addText("No movers today");
    empty.font = Font.regularSystemFont(12);
    empty.textColor = MUTED;
    w.addSpacer(null);
    return w;
  }

  movers.forEach((h, i) => {
    addRow(list, h, sparklines[h.ticker], code, layout, i === movers.length - 1);
  });

  // Pin rows to the top; leftover height sits below (avoids huge mid-gaps).
  w.addSpacer(null);

  return w;
}

function createErrorWidget(message, layout) {
  const w = new ListWidget();
  w.backgroundColor = BG;
  const p = layout?.padding ?? 12;
  w.setPadding(p, p, p, p);
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

function presentByFamily(widget, family) {
  if (family === "large") widget.presentLarge();
  else if (family === "small") widget.presentSmall();
  else widget.presentMedium();
}

async function run() {
  const family = widgetFamily();
  const layout = layoutFor(family);

  let data;
  try {
    data = await fetchData();
    if (data.error) throw new Error(data.error);
  } catch (e) {
    const w = createErrorWidget(e.message, layout);
    w.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);
    if (config.runsInWidget) Script.setWidget(w);
    else presentByFamily(w, family);
    Script.complete();
    return;
  }

  const movers = pickTopMovers(
    data.topHoldings || [],
    layout.gainers,
    layout.losers,
    layout.rows,
  ).slice(0, layout.rows);

  let sparklines = {};
  if (layout.showSpark) {
    const sparkEntries = await Promise.all(
      movers.map(async (h) => [h.ticker, await fetchSparklinePoints(h.ticker)]),
    );
    sparklines = Object.fromEntries(sparkEntries);
  }

  const widget = createMoversWidget(data, movers, sparklines, layout);
  widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    presentByFamily(widget, family);
  }
  Script.complete();
}

await run();
