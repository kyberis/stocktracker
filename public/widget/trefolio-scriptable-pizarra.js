// trefolio — Pizarra (Agent Board) Widget for Scriptable
// Paste this script in the Scriptable app, then add a Scriptable widget to your home screen.
// Shows AI-picked notes from Warren and Clara. Not financial advice.
// Enable the board in trefolio Home first. Token: trefolio.com → Profile → Widget Access.
// Adapts layout for Small / Medium / Large (config.widgetFamily).

const TOKEN = "YOUR_TOKEN_HERE";
const API_URL = "https://trefolio.com/api/agent-board/messages";
const ICON_URL = "https://trefolio.com/favicon.png";
const APP_URL = "https://trefolio.com";
const REFRESH_MINUTES = 15;

const BG = new Color("#0f172a");
const TEXT = new Color("#f1f5f9");
const MUTED = new Color("#94a3b8");
const GREEN = new Color("#10b981");
const WARREN = new Color("#f59e0b");
const CLARA = new Color("#38bdf8");
const RED = new Color("#ef4444");

function widgetFamily() {
  const f = config.widgetFamily;
  if (f === "small" || f === "medium" || f === "large") return f;
  return "medium";
}

function layoutFor(family) {
  if (family === "small") {
    return { rows: 2, padding: 10, titleFont: 10, agentFont: 8, bodyFont: 10, lineLimit: 3 };
  }
  if (family === "large") {
    return { rows: 5, padding: 12, titleFont: 11, agentFont: 9, bodyFont: 12, lineLimit: 3 };
  }
  return { rows: 3, padding: 12, titleFont: 10, agentFont: 9, bodyFont: 11, lineLimit: 2 };
}

async function fetchData() {
  const req = new Request(API_URL);
  req.headers = { Authorization: `Bearer ${String(TOKEN).trim()}` };
  req.timeoutInterval = 20;
  const body = await req.loadString();
  const status = req.response.statusCode;
  if (status < 200 || status >= 300) {
    let detail = `HTTP ${status}`;
    const looksLikeChallenge =
      typeof body === "string" &&
      (body.includes("Just a moment") || body.includes("cf-browser-verification") || body.includes("Attention Required"));
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.error === "string" && parsed.error) {
        detail = `${detail}: ${parsed.error}`;
      } else if (parsed?.reason === "rate_limited") {
        detail = `${detail}: rate limited — wait a few minutes`;
      }
    } catch {
      if (looksLikeChallenge) {
        detail = `${detail}: network challenge — retry on Wi‑Fi or cellular`;
      }
    }
    if (status === 401) {
      detail = `${detail} — regenerate token at trefolio.com → Profile → Widget Access`;
    }
    throw new Error(detail);
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

function agentLabel(agent) {
  return agent === "clara" ? "Clara" : "Warren";
}

function agentColor(agent) {
  return agent === "clara" ? CLARA : WARREN;
}

function createWidget(data, icon, family) {
  const layout = layoutFor(family);
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.setPadding(layout.padding, layout.padding + 2, layout.padding, layout.padding + 2);
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

  const title = header.addText("Pizarra");
  title.font = Font.boldSystemFont(layout.titleFont);
  title.textColor = GREEN;

  header.addSpacer(null);

  const hint = header.addText("Not advice");
  hint.font = Font.regularSystemFont(8);
  hint.textColor = MUTED;

  w.addSpacer(6);

  if (!data.enabled) {
    const empty = w.addText("Turn on Pizarra in trefolio Home to see Warren and Clara notes here.");
    empty.font = Font.regularSystemFont(layout.bodyFont);
    empty.textColor = MUTED;
    empty.lineLimit = 4;
    w.addSpacer(null);
    return w;
  }

  const messages = Array.isArray(data.messages) ? data.messages : [];
  if (messages.length === 0) {
    const empty = w.addText("No new notes. Warren and Clara will post when something important changes.");
    empty.font = Font.regularSystemFont(layout.bodyFont);
    empty.textColor = MUTED;
    empty.lineLimit = 4;
    w.addSpacer(null);
    return w;
  }

  const rows = messages.slice(0, layout.rows);
  for (let i = 0; i < rows.length; i++) {
    const msg = rows[i];
    const row = w.addStack();
    row.layoutVertically();
    row.spacing = 1;

    const agent = row.addText(agentLabel(msg.agent));
    agent.font = Font.boldSystemFont(layout.agentFont);
    agent.textColor = agentColor(msg.agent);

    const body = row.addText(String(msg.body || ""));
    body.font = Font.regularSystemFont(layout.bodyFont);
    body.textColor = TEXT;
    body.lineLimit = layout.lineLimit;
    body.minimumScaleFactor = 0.85;

    if (i < rows.length - 1) w.addSpacer(6);
  }

  w.addSpacer(null);
  return w;
}

function errorWidget(message) {
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.setPadding(12, 14, 12, 14);
  w.url = APP_URL;
  const err = w.addText("Unable to load Pizarra");
  err.font = Font.regularSystemFont(12);
  err.textColor = RED;
  w.addSpacer(4);
  const hint = w.addText(String(message || "Check token"));
  hint.font = Font.regularSystemFont(8);
  hint.textColor = MUTED;
  return w;
}

async function run() {
  const family = widgetFamily();
  try {
    const [data, icon] = await Promise.all([fetchData(), fetchIcon()]);
    const widget = createWidget(data, icon, family);
    widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);
    if (config.runsInWidget) {
      Script.setWidget(widget);
    } else if (family === "large") {
      widget.presentLarge();
    } else if (family === "small") {
      widget.presentSmall();
    } else {
      widget.presentMedium();
    }
  } catch (e) {
    const widget = errorWidget(e && e.message);
    widget.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);
    if (config.runsInWidget) {
      Script.setWidget(widget);
    } else {
      widget.presentMedium();
    }
  }
  Script.complete();
}

await run();
