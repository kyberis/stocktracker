/**
 * Register Clover Telegram webhook.
 *
 *   PUBLIC_BASE_URL=https://trefolio.com \
 *   CLOVER_TELEGRAM_BOT_TOKEN=... \
 *   CLOVER_TELEGRAM_WEBHOOK_SECRET=... \
 *   npx tsx scripts/clover-telegram-set-webhook.ts
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

const BOT_TOKEN = process.env.CLOVER_TELEGRAM_BOT_TOKEN || "";
const SECRET = process.env.CLOVER_TELEGRAM_WEBHOOK_SECRET || "";
const BASE_URL = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "";

if (!BOT_TOKEN || !SECRET || !BASE_URL) {
  console.error("Set CLOVER_TELEGRAM_BOT_TOKEN, CLOVER_TELEGRAM_WEBHOOK_SECRET, PUBLIC_BASE_URL");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const webhookUrl = `${BASE_URL.replace(/\/$/, "")}/api/webhooks/telegram/clover/${SECRET}`;

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

async function main() {
  const me = await call("getMe", {});
  console.log("Bot:", me.result?.username);

  await call("setWebhook", {
    url: webhookUrl,
    secret_token: SECRET,
    allowed_updates: ["message", "edited_message", "callback_query"],
    drop_pending_updates: true,
  });
  console.log("Webhook set:", webhookUrl);

  await call("setMyCommands", {
    commands: [
      { command: "help", description: "What Clover can do (Warren + Clara behind the scenes)" },
      { command: "menu", description: "Show capability menu" },
      { command: "holdings", description: "List your positions" },
      { command: "unlink", description: "Disconnect this Telegram chat" },
    ],
  });
  console.log("Commands published.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
