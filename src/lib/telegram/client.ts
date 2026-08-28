/**
 * Thin HTTPS wrapper around the Telegram Bot API. We avoid the official
 * `node-telegram-bot-api` package because we only need a handful of methods
 * and we never run polling — only webhook + outbound calls.
 *
 * Reference: https://core.telegram.org/bots/api
 *
 * All methods are best-effort: network or API errors are logged but do not
 * throw, so a failed Telegram send never breaks the webhook flow.
 */

const TG_API_BASE = "https://api.telegram.org";

export type TelegramParseMode = "MarkdownV2" | "HTML";

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramInlineKeyboard {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface SendMessageOptions {
  parseMode?: TelegramParseMode;
  replyMarkup?: TelegramInlineKeyboard;
  disableWebPagePreview?: boolean;
  /** When set, replies in a thread (for forum supergroups). Usually omitted. */
  messageThreadId?: number;
}

export interface SendPhotoOptions {
  /** Optional caption rendered below the image. */
  caption?: string;
  parseMode?: TelegramParseMode;
  replyMarkup?: TelegramInlineKeyboard;
  /** When set, replies in a thread (for forum supergroups). */
  messageThreadId?: number;
}

export interface SendVoiceOptions {
  /** Optional caption rendered below the voice note (max 1024 chars). */
  caption?: string;
  parseMode?: TelegramParseMode;
  replyMarkup?: TelegramInlineKeyboard;
  /** Duration in seconds (Telegram clients may use it for the waveform). */
  duration?: number;
  messageThreadId?: number;
}

export interface TelegramFileMeta {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export interface EditMessageOptions {
  parseMode?: TelegramParseMode;
  replyMarkup?: TelegramInlineKeyboard;
  disableWebPagePreview?: boolean;
}

export interface BotCommand {
  command: string;
  description: string;
}

export interface TelegramApiResult<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface SentMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
}

export interface TelegramClient {
  sendMessage(chatId: string | number, text: string, opts?: SendMessageOptions): Promise<SentMessage | null>;
  /**
   * Send a photo by HTTPS URL. Telegram fetches the image server-side, so
   * the URL must be reachable from Telegram's servers (no localhost) and
   * smaller than 5 MB.
   */
  sendPhoto(chatId: string | number, photoUrl: string, opts?: SendPhotoOptions): Promise<SentMessage | null>;
  /**
   * Send a voice note (OGG/Opus). Telegram displays this as a playable
   * voice bubble with a waveform — distinct from `sendAudio` (music files).
   */
  sendVoice(
    chatId: string | number,
    audio: Buffer,
    opts?: SendVoiceOptions,
  ): Promise<SentMessage | null>;
  sendChatAction(
    chatId: string | number,
    action: "typing" | "upload_photo" | "record_voice" | "upload_voice",
  ): Promise<void>;
  /**
   * Resolve a `file_id` to a downloadable `file_path` and metadata. Files
   * over 20 MB cannot be retrieved through the Bot API.
   */
  getFile(fileId: string): Promise<TelegramFileMeta | null>;
  /**
   * Download the bytes for a previously resolved `file_path`. Returns the
   * raw buffer plus the response `Content-Type` so the caller can guess
   * the right extension for OpenAI Whisper.
   */
  downloadFile(filePath: string): Promise<{ buffer: Buffer; contentType: string } | null>;
  editMessageText(
    chatId: string | number,
    messageId: number,
    text: string,
    opts?: EditMessageOptions,
  ): Promise<void>;
  /** Best-effort delete; failures (already deleted, too old) are swallowed. */
  deleteMessage(chatId: string | number, messageId: number): Promise<void>;
  answerCallbackQuery(callbackQueryId: string, text?: string, showAlert?: boolean): Promise<void>;
  setWebhook(url: string, secretToken: string): Promise<TelegramApiResult<unknown>>;
  deleteWebhook(): Promise<TelegramApiResult<unknown>>;
  setMyCommands(commands: BotCommand[], languageCode?: string): Promise<TelegramApiResult<unknown>>;
  getMe(): Promise<TelegramApiResult<{ id: number; username: string; first_name: string }>>;
}

export class HttpTelegramClient implements TelegramClient {
  constructor(private readonly token: string) {}

  private get baseUrl(): string {
    return `${TG_API_BASE}/bot${this.token}`;
  }

  private async call<T>(method: string, body: Record<string, unknown>): Promise<TelegramApiResult<T>> {
    try {
      const res = await fetch(`${this.baseUrl}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as TelegramApiResult<T>;
      if (!json.ok) {
        console.warn(`[telegram] ${method} failed`, json.error_code, json.description);
      }
      return json;
    } catch (err) {
      console.warn(`[telegram] ${method} threw`, err instanceof Error ? err.message : err);
      return { ok: false, description: err instanceof Error ? err.message : String(err) };
    }
  }

  async sendMessage(
    chatId: string | number,
    text: string,
    opts: SendMessageOptions = {},
  ): Promise<SentMessage | null> {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
    };
    if (opts.parseMode) body.parse_mode = opts.parseMode;
    if (opts.replyMarkup) body.reply_markup = opts.replyMarkup;
    if (opts.disableWebPagePreview !== undefined) {
      body.disable_web_page_preview = opts.disableWebPagePreview;
    }
    if (opts.messageThreadId !== undefined) body.message_thread_id = opts.messageThreadId;
    const result = await this.call<SentMessage>("sendMessage", body);
    return result.ok && result.result ? result.result : null;
  }

  async sendPhoto(
    chatId: string | number,
    photoUrl: string,
    opts: SendPhotoOptions = {},
  ): Promise<SentMessage | null> {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      photo: photoUrl,
    };
    if (opts.caption) body.caption = opts.caption;
    if (opts.parseMode) body.parse_mode = opts.parseMode;
    if (opts.replyMarkup) body.reply_markup = opts.replyMarkup;
    if (opts.messageThreadId !== undefined) body.message_thread_id = opts.messageThreadId;
    const result = await this.call<SentMessage>("sendPhoto", body);
    return result.ok && result.result ? result.result : null;
  }

  async sendVoice(
    chatId: string | number,
    audio: Buffer,
    opts: SendVoiceOptions = {},
  ): Promise<SentMessage | null> {
    try {
      const form = new FormData();
      form.append("chat_id", String(chatId));
      form.append(
        "voice",
        new Blob([new Uint8Array(audio)], { type: "audio/ogg" }),
        "voice.ogg",
      );
      if (opts.caption) form.append("caption", opts.caption);
      if (opts.parseMode) form.append("parse_mode", opts.parseMode);
      if (opts.duration !== undefined) form.append("duration", String(opts.duration));
      if (opts.replyMarkup) form.append("reply_markup", JSON.stringify(opts.replyMarkup));
      if (opts.messageThreadId !== undefined) {
        form.append("message_thread_id", String(opts.messageThreadId));
      }
      const res = await fetch(`${this.baseUrl}/sendVoice`, {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as TelegramApiResult<SentMessage>;
      if (!json.ok) {
        console.warn("[telegram] sendVoice failed", json.error_code, json.description);
        return null;
      }
      return json.result || null;
    } catch (err) {
      console.warn(
        "[telegram] sendVoice threw",
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  async sendChatAction(
    chatId: string | number,
    action: "typing" | "upload_photo" | "record_voice" | "upload_voice",
  ): Promise<void> {
    await this.call("sendChatAction", { chat_id: chatId, action });
  }

  async getFile(fileId: string): Promise<TelegramFileMeta | null> {
    const result = await this.call<TelegramFileMeta>("getFile", { file_id: fileId });
    return result.ok && result.result ? result.result : null;
  }

  async downloadFile(
    filePath: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    try {
      const url = `${TG_API_BASE}/file/bot${this.token}/${filePath}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn("[telegram] downloadFile failed", res.status, res.statusText);
        return null;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType =
        res.headers.get("content-type") || "application/octet-stream";
      return { buffer, contentType };
    } catch (err) {
      console.warn(
        "[telegram] downloadFile threw",
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  async editMessageText(
    chatId: string | number,
    messageId: number,
    text: string,
    opts: EditMessageOptions = {},
  ): Promise<void> {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      message_id: messageId,
      text,
    };
    if (opts.parseMode) body.parse_mode = opts.parseMode;
    if (opts.replyMarkup) body.reply_markup = opts.replyMarkup;
    if (opts.disableWebPagePreview !== undefined) {
      body.disable_web_page_preview = opts.disableWebPagePreview;
    }
    await this.call("editMessageText", body);
  }

  async deleteMessage(chatId: string | number, messageId: number): Promise<void> {
    await this.call("deleteMessage", { chat_id: chatId, message_id: messageId });
  }

  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert = false,
  ): Promise<void> {
    const body: Record<string, unknown> = { callback_query_id: callbackQueryId };
    if (text) body.text = text.slice(0, 200);
    if (showAlert) body.show_alert = true;
    await this.call("answerCallbackQuery", body);
  }

  async setWebhook(url: string, secretToken: string): Promise<TelegramApiResult<unknown>> {
    return this.call("setWebhook", {
      url,
      secret_token: secretToken,
      drop_pending_updates: true,
      allowed_updates: ["message", "callback_query"],
    });
  }

  async deleteWebhook(): Promise<TelegramApiResult<unknown>> {
    return this.call("deleteWebhook", { drop_pending_updates: false });
  }

  async setMyCommands(
    commands: BotCommand[],
    languageCode?: string,
  ): Promise<TelegramApiResult<unknown>> {
    const body: Record<string, unknown> = { commands };
    if (languageCode) body.language_code = languageCode;
    return this.call("setMyCommands", body);
  }

  async getMe(): Promise<TelegramApiResult<{ id: number; username: string; first_name: string }>> {
    return this.call("getMe", {});
  }
}

/** Returns the configured bot token, or throws if unset. */
export function getTelegramBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  return token;
}

export function getTelegramBotUsername(): string {
  return (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
}

export function getTelegramWebhookSecret(): string {
  return process.env.TELEGRAM_WEBHOOK_SECRET || "";
}

/**
 * Returns a bot API client. In tests, replace via `setTestTelegramClient`.
 */
export function getTelegramClient(): TelegramClient {
  if (testClient) return testClient;
  return new HttpTelegramClient(getTelegramBotToken());
}

let testClient: TelegramClient | null = null;
export function setTestTelegramClient(client: TelegramClient | null): void {
  testClient = client;
}
