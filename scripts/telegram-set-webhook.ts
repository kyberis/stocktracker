/**
 * One-shot setup: register the Telegram webhook URL with the Bot API and
 * publish the `/help`-style commands list shown in Telegram's UI.
 *
 * Usage:
 *   PUBLIC_BASE_URL=https://trefolio.com \
 *   TELEGRAM_BOT_TOKEN=... \
 *   TELEGRAM_WEBHOOK_SECRET=... \
 *   npx tsx scripts/telegram-set-webhook.ts
 *
 * Re-run after rotating the webhook secret or moving environments.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const BASE_URL = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "";

if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}
if (!SECRET) {
  console.error("TELEGRAM_WEBHOOK_SECRET is not set");
  process.exit(1);
}
if (!BASE_URL) {
  console.error("PUBLIC_BASE_URL is not set (e.g. https://trefolio.com)");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function call(method: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok?: boolean; description?: string };
  if (!json.ok) throw new Error(`${method} failed: ${json.description || "unknown"}`);
  return json;
}

const COMMANDS_EN = [
  { command: "help", description: "What Warren can do" },
  { command: "menu", description: "Show capability menu" },
  { command: "portfolios", description: "List your portfolios" },
  { command: "holdings", description: "List your positions" },
  { command: "growth", description: "Portfolio growth and performance" },
  { command: "news", description: "Latest news on your holdings" },
  { command: "dividends", description: "Dividend income and calendar" },
  { command: "alerts", description: "Active price alerts" },
  { command: "watchlist", description: "Tickers you're watching" },
  { command: "lang", description: "Set reply language: /lang es" },
  { command: "unlink", description: "Disconnect this Telegram chat" },
];

const COMMANDS_ES = [
  { command: "help", description: "Qué puede hacer Warren" },
  { command: "menu", description: "Ver el menú de capacidades" },
  { command: "portfolios", description: "Listar tus carteras" },
  { command: "holdings", description: "Listar tus posiciones" },
  { command: "growth", description: "Rendimiento de la cartera" },
  { command: "news", description: "Noticias de tus posiciones" },
  { command: "dividends", description: "Dividendos y calendario" },
  { command: "alerts", description: "Alertas de precio activas" },
  { command: "watchlist", description: "Tickers en seguimiento" },
  { command: "lang", description: "Idioma de respuesta: /lang en" },
  { command: "unlink", description: "Desconectar este chat" },
];

async function main() {
  const url = `${BASE_URL.replace(/\/+$/, "")}/api/webhooks/telegram/${SECRET}`;
  console.log("Setting webhook to", url);
  await call("setWebhook", {
    url,
    secret_token: SECRET,
    drop_pending_updates: true,
    allowed_updates: ["message", "callback_query"],
  });

  console.log("Publishing /help commands (en, es)…");
  await call("setMyCommands", { commands: COMMANDS_EN });
  await call("setMyCommands", { commands: COMMANDS_ES, language_code: "es" });

  const me = await call("getMe", {});
  console.log("Bot is live as @" + (me.result?.username || "unknown"));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
