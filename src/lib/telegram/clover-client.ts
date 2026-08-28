import { HttpTelegramClient, type TelegramClient } from "@/lib/telegram/client";

/** Returns Clover bot token or empty string if unset. */
export function getCloverTelegramBotToken(): string {
  return process.env.CLOVER_TELEGRAM_BOT_TOKEN || "";
}

export function getCloverTelegramBotUsername(): string {
  return (process.env.CLOVER_TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
}

export function getCloverTelegramWebhookSecret(): string {
  return process.env.CLOVER_TELEGRAM_WEBHOOK_SECRET || "";
}

export function isCloverTelegramConfigured(): boolean {
  return Boolean(getCloverTelegramBotToken() && getCloverTelegramBotUsername());
}

export function getCloverTelegramClient(): TelegramClient {
  const token = getCloverTelegramBotToken();
  if (!token) throw new Error("CLOVER_TELEGRAM_BOT_TOKEN is not set");
  return new HttpTelegramClient(token);
}
