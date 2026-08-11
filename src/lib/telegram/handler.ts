/**
 * Telegram update router. Receives parsed `Update` objects from the webhook
 * and dispatches them to:
 *   - command handlers (`/start`, `/help`, `/holdings`, `/news`, …)
 *   - the Warren AI turn (free-form text)
 *   - proposal callbacks (Confirm / Cancel buttons)
 *
 * The handler reuses `runWarrenTurn`, `dispatchProposal`, and
 * `buildPortfolioSnapshot` so Telegram has feature parity with the web
 * Warren drawer.
 */

import { decodeProposalCallback } from "@kyberis/agent-os/safety";

import {
  appendChatMessage,
  completeTelegramLink,
  consumeLinkToken,
  findUserById,
  getChatLinkByChatId,
  getDefaultPortfolio,
  getPendingProposal,
  getUserSettings,
  isFeatureEnabled,
  linkChat,
  listAlerts,
  listHoldings,
  listPortfolios,
  countHoldings,
  listActiveAgentMissions,
  loadChatMessages,
  setChatLanguage,
  savePendingProposal,
  setChatActivePortfolio,
  touchChatLastSeen,
  unlinkChat,
  updateProposalStatus,
  type TelegramChatLink,
} from "@/lib/db";
import { requireFeatureQuotaByUserId, requireTrefolioProByUserId } from "@/lib/auth/guards";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { checkWarrenEmptyAddRateLimit } from "@/lib/rate-limit";
import {
  WARREN_EMPTY_ADD_MAX_CONSULTS,
} from "@/lib/ai/warren/empty-add-stock";
import type { ModelMessage, UserContent } from "ai";
import { runWarrenTurn } from "@/lib/ai/warren/run-turn";
import { buildWarrenPrefetchAppendix } from "@/lib/ai/warren/warren-prefetch-appendix";
import { resolveOfficeIdentity } from "@/lib/ai/office/office-identity";
import {
  buildWarrenMultimodalUserContent,
  WarrenAttachmentError,
  type RawAttachment,
} from "@/lib/ai/warren/preprocess-attachments";
import { buildPortfolioSnapshot } from "@/lib/ai/warren/build-snapshot";
import { dispatchProposal } from "@/lib/ai/warren/dispatch";
import type { WarrenProposal, WarrenProposalKind } from "@/lib/ai/warren/types";
import type { SubscriptionPlan } from "@/lib/types";
import {
  bold,
  commonMarkToTelegram,
  escapeMarkdown,
  italic,
  renderHelpMenu,
  renderWarrenPart,
  renderWarrenProposal,
  splitForTelegram,
  stripMarkdownForPlain,
  type HelpStrings,
} from "./format";
import {
  getTelegramBotUsername,
  getTelegramClient,
  type TelegramClient,
} from "./client";
import { localizeTelegram, type TelegramLocale } from "./i18n";
import { buildPortfolioAllocationChart, sendChartPart } from "./chart-render";
import { transcribeVoice } from "@/lib/ai/transcribe";
import { synthesizeSpeech } from "@/lib/ai/tts";

export interface TelegramUpdate {
  update_id?: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramVoice {
  file_id: string;
  /** Duration in seconds. */
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramPhotoSize {
  file_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number; type: string };
  date: number;
  text?: string;
  caption?: string;
  voice?: TelegramVoice;
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
  entities?: Array<{ type: string; offset: number; length: number }>;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

const TELEGRAM_FLAG = "telegram_bot_enabled";

/** Voice notes longer than this (seconds) are rejected before transcription. */
const VOICE_MAX_DURATION_S = 60;
/** Voice notes larger than this (bytes) are rejected before download. */
const VOICE_MAX_BYTES = 4 * 1024 * 1024;

/**
 * Top-level entrypoint called from the webhook route.
 *
 * Always returns a resolved promise — never throws — so the webhook can
 * always return 200 to Telegram and avoid retry storms.
 */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  try {
    const enabled = await isFeatureEnabled(TELEGRAM_FLAG);
    if (!enabled) {
      // Silently drop updates if the platform flag is off. Operators may
      // disable globally without redeploying.
      return;
    }

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return;
    }
    const message = update.message || update.edited_message;
    if (message) await handleMessage(message);
  } catch (err) {
    console.error("[telegram] handleTelegramUpdate failed", err);
  }
}

// ────────────────────────────── Messages ──────────────────────────────

async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = String(message.chat.id);
  const text = (message.text || "").trim();

  const bot = getTelegramClient();
  const link = await getChatLinkByChatId(chatId);
  if (link) await touchChatLastSeen(chatId);

  // Voice notes: transcribe and run a Warren turn that replies via TTS too.
  if (message.voice) {
    if (!link) {
      const langGuess = inferLocale(message.from?.language_code);
      const i = localizeTelegram(langGuess);
      await sendMd(bot, chatId, escapeMarkdown(i.notLinked(getTelegramBotUsername())));
      return;
    }
    await handleVoiceMessage(bot, message, link);
    return;
  }

  if (message.photo && message.photo.length > 0) {
    if (!link) {
      const langGuess = inferLocale(message.from?.language_code);
      const i = localizeTelegram(langGuess);
      await sendMd(bot, chatId, escapeMarkdown(i.notLinked(getTelegramBotUsername())));
      return;
    }
    await handlePhotoOrDocumentWarren(bot, message, link);
    return;
  }

  if (message.document) {
    if (!link) {
      const langGuess = inferLocale(message.from?.language_code);
      const i = localizeTelegram(langGuess);
      await sendMd(bot, chatId, escapeMarkdown(i.notLinked(getTelegramBotUsername())));
      return;
    }
    await handlePhotoOrDocumentWarren(bot, message, link);
    return;
  }

  if (!text) return;

  // Bot commands take precedence regardless of link state.
  if (text.startsWith("/")) {
    await handleCommand(bot, message, text, link);
    return;
  }

  // Free-form: must be linked to talk to Warren.
  if (!link) {
    const langGuess = inferLocale(message.from?.language_code);
    const i = localizeTelegram(langGuess);
    await sendMd(bot, chatId, escapeMarkdown(i.notLinked(getTelegramBotUsername())));
    return;
  }

  await runWarrenForMessage(bot, message, link);
}

async function handleVoiceMessage(
  bot: TelegramClient,
  message: TelegramMessage,
  link: TelegramChatLink,
): Promise<void> {
  const chatId = String(message.chat.id);
  const voice = message.voice!;
  const i = await localeForLink(link, message.from?.language_code);

  if (voice.duration > VOICE_MAX_DURATION_S) {
    await sendMd(bot, chatId, escapeMarkdown(i.voiceTooLong(VOICE_MAX_DURATION_S)));
    return;
  }
  if (voice.file_size && voice.file_size > VOICE_MAX_BYTES) {
    await sendMd(bot, chatId, escapeMarkdown(i.voiceTooLarge));
    return;
  }

  await bot.sendChatAction(chatId, "typing");

  const fileMeta = await bot.getFile(voice.file_id);
  if (!fileMeta?.file_path) {
    await sendMd(bot, chatId, escapeMarkdown(i.voiceTranscribeFailed));
    return;
  }

  const file = await bot.downloadFile(fileMeta.file_path);
  if (!file) {
    await sendMd(bot, chatId, escapeMarkdown(i.voiceTranscribeFailed));
    return;
  }

  const language = link.languageCode || inferLocale(message.from?.language_code);
  const transcript = await transcribeVoice({
    buffer: file.buffer,
    mimeType: voice.mime_type || file.contentType || "audio/ogg",
    language,
  });

  if (!transcript.ok || !transcript.text) {
    await sendMd(bot, chatId, escapeMarkdown(i.voiceTranscribeFailed));
    return;
  }

  // Echo what we heard so the user can spot misrecognized tickers.
  const echo = i.voiceTranscribed(transcript.text);
  await sendMd(bot, chatId, commonMarkToTelegram(echo));

  await runWarrenForText(bot, link, transcript.text, message.from?.language_code, {
    replyAsVoice: true,
  });
}

async function handlePhotoOrDocumentWarren(
  bot: TelegramClient,
  message: TelegramMessage,
  link: TelegramChatLink,
): Promise<void> {
  const chatId = String(message.chat.id);
  const i = await localeForLink(link, message.from?.language_code);
  const caption = (message.caption || "").trim();

  const isPhoto = !!(message.photo && message.photo.length > 0);
  await bot.sendChatAction(chatId, isPhoto ? "upload_photo" : "typing");

  const raw: RawAttachment[] = [];

  try {
    if (message.photo && message.photo.length > 0) {
      const largest = message.photo[message.photo.length - 1];
      const fileMeta = await bot.getFile(largest.file_id);
      if (!fileMeta?.file_path) {
        await sendMd(bot, chatId, escapeMarkdown(i.voiceTranscribeFailed));
        return;
      }
      const file = await bot.downloadFile(fileMeta.file_path);
      if (!file) {
        await sendMd(bot, chatId, escapeMarkdown(i.voiceTranscribeFailed));
        return;
      }
      raw.push({
        buffer: file.buffer,
        mimeType: file.contentType?.startsWith("image/") ? file.contentType : "image/jpeg",
        filename: "photo.jpg",
      });
    } else if (message.document) {
      const doc = message.document;
      const fileMeta = await bot.getFile(doc.file_id);
      if (!fileMeta?.file_path) {
        await sendMd(bot, chatId, escapeMarkdown(i.voiceTranscribeFailed));
        return;
      }
      const file = await bot.downloadFile(fileMeta.file_path);
      if (!file) {
        await sendMd(bot, chatId, escapeMarkdown(i.voiceTranscribeFailed));
        return;
      }
      raw.push({
        buffer: file.buffer,
        mimeType: doc.mime_type || file.contentType || "application/octet-stream",
        filename: doc.file_name || "document",
      });
    }

    if (raw.length === 0) return;

    const built = await buildWarrenMultimodalUserContent({
      caption,
      files: raw,
      transcribeLanguageHint: link.languageCode || undefined,
    });

    await runWarrenForText(bot, link, built.persistSummary, message.from?.language_code, {
      lastUserModelContent: built.content,
    });
  } catch (e) {
    if (e instanceof WarrenAttachmentError) {
      await sendMd(bot, chatId, escapeMarkdown(e.message));
      return;
    }
    console.error("[telegram] handlePhotoOrDocumentWarren", e);
    await sendMd(bot, chatId, escapeMarkdown(i.aiError));
  }
}

async function handleCommand(
  bot: TelegramClient,
  message: TelegramMessage,
  text: string,
  link: TelegramChatLink | null,
): Promise<void> {
  const chatId = String(message.chat.id);
  const [rawCmd, ...rest] = text.split(/\s+/);
  // Strip @BotName suffix used in groups: /start@WarrenBot
  const cmd = rawCmd.split("@")[0].toLowerCase();
  const arg = rest.join(" ").trim();

  // /start <token> — link the chat (works whether linked or not).
  if (cmd === "/start") {
    await handleStartCommand(bot, message, arg);
    return;
  }

  // For all other commands the chat must already be linked.
  if (!link) {
    const i = localizeTelegram(inferLocale(message.from?.language_code));
    await sendMd(bot, chatId, escapeMarkdown(i.notLinked(getTelegramBotUsername())));
    return;
  }

  const i = await localeForLink(link, message.from?.language_code);

  switch (cmd) {
    case "/help":
    case "/menu":
      await sendMd(bot, chatId, renderHelpMenu(buildHelp(i)));
      return;

    case "/unlink": {
      await unlinkChat(chatId);
      await sendMd(bot, chatId, escapeMarkdown(i.unlinked));
      return;
    }

    case "/lang": {
      const code = arg.slice(0, 5).toLowerCase();
      if (!code) {
        await sendMd(bot, chatId, escapeMarkdown(i.langUsage));
        return;
      }
      await setChatLanguage(chatId, code);
      const next = await localeForLink({ ...link, languageCode: code }, code);
      await sendMd(bot, chatId, escapeMarkdown(next.langSet(code)));
      return;
    }

    case "/portfolios": {
      const portfolios = await listPortfolios(link.userId);
      if (portfolios.length === 0) {
        await sendMd(bot, chatId, escapeMarkdown(i.noPortfolios));
        return;
      }
      const lines: string[] = [bold(i.yourPortfolios)];
      for (const p of portfolios) {
        const marker = p.id === link.lastActivePortfolioId ? " ◀" : "";
        lines.push(
          `• ${bold(p.name)} \\(${escapeMarkdown(p.currency)}\\)${escapeMarkdown(marker)}`,
        );
      }
      await sendMd(bot, chatId, lines.join("\n"));
      return;
    }

    case "/holdings": {
      const portfolioId = await resolvePortfolio(link);
      const holdings = await listHoldings(link.userId, portfolioId);
      if (holdings.length === 0) {
        await sendMd(bot, chatId, escapeMarkdown(i.noHoldings));
        return;
      }
      const lines: string[] = [bold(i.yourHoldings)];
      for (const h of holdings.slice(0, 30)) {
        lines.push(
          `• ${bold(h.ticker)} — ${escapeMarkdown(String(h.shares))} ` +
            escapeMarkdown(`@ ${h.purchasePrice.toFixed(2)} ${h.displayCurrency}`),
        );
      }
      if (holdings.length > 30) {
        lines.push(escapeMarkdown(i.andMore(holdings.length - 30)));
      }
      await sendMd(bot, chatId, lines.join("\n"));
      return;
    }

    case "/alerts": {
      const alerts = await listAlerts(link.userId);
      if (alerts.length === 0) {
        await sendMd(bot, chatId, escapeMarkdown(i.noAlerts));
        return;
      }
      const lines: string[] = [bold(i.yourAlerts)];
      for (const a of alerts.slice(0, 30)) {
        const condStr = a.condition === "above" ? "≥" : "≤";
        lines.push(
          `• ${bold(a.ticker)} ${escapeMarkdown(condStr)} ${escapeMarkdown(String(a.threshold))}`,
        );
      }
      await sendMd(bot, chatId, lines.join("\n"));
      return;
    }

    case "/chart": {
      const portfolioId = await resolvePortfolio(link);
      const portfolios = await listPortfolios(link.userId).catch(() => []);
      const active = portfolios.find((p) => p.id === portfolioId);
      const data = await buildPortfolioAllocationChart({
        userId: link.userId,
        portfolioId,
        baseCurrency: active?.currency || "EUR",
        title: i.allocationChartTitle,
      });
      if (!data) {
        await sendMd(bot, chatId, escapeMarkdown(i.chartUnavailable));
        return;
      }
      const sent = await sendChartPart(bot, chatId, data);
      if (!sent) {
        await sendMd(bot, chatId, escapeMarkdown(i.chartUnavailable));
      }
      return;
    }

    case "/office": {
      const pro = await requireTrefolioProByUserId(link.userId);
      if (!pro.allowed) {
        await sendMd(bot, chatId, escapeMarkdown(i.officeProRequired));
        return;
      }
      const missions = await listActiveAgentMissions(link.userId);
      const active = missions[0];
      if (!active) {
        await sendMd(
          bot,
          chatId,
          `${escapeMarkdown(i.officeNoMission)}\n\n${escapeMarkdown(i.officeOpenWeb)}`,
        );
        return;
      }
      const pending = active.steps.filter(
        (s) => s.status !== "done" && s.status !== "skipped" && s.status !== "cancelled",
      ).length;
      await sendMd(
        bot,
        chatId,
        `${escapeMarkdown(i.officeMissionSummary(active.title, pending))}\n\n${escapeMarkdown(i.officeOpenWeb)}`,
      );
      return;
    }

    case "/news":
    case "/growth":
    case "/watchlist":
    case "/dividends": {
      // Delegate to Warren so it can use the right tools and answer in
      // natural language (charts/news live there).
      const promptByCmd: Record<string, string> = {
        "/news": "Show me the most recent news about my portfolio holdings.",
        "/growth":
          "How has my portfolio grown lately? Summarize total return, day change, and the top contributors and laggards.",
        "/watchlist": "List the tickers in my watchlist.",
        "/dividends": "Summarize my dividend income and any upcoming ex-dividend dates.",
      };
      await runWarrenForText(bot, link, promptByCmd[cmd], message.from?.language_code);
      return;
    }

    default:
      await sendMd(bot, chatId, escapeMarkdown(i.unknownCommand));
  }
}

async function handleStartCommand(
  bot: TelegramClient,
  message: TelegramMessage,
  arg: string,
): Promise<void> {
  const chatId = String(message.chat.id);
  const langCode = message.from?.language_code || "";

  // No token: greeting + how to link.
  if (!arg) {
    const i = localizeTelegram(inferLocale(langCode));
    const existing = await getChatLinkByChatId(chatId);
    if (existing) {
      await sendMd(bot, chatId, renderHelpMenu(buildHelp(i)));
    } else {
      await sendMd(bot, chatId, escapeMarkdown(i.notLinked(getTelegramBotUsername())));
    }
    return;
  }

  // Tokens come from two places that both produce the same /start <token>
  // deep link: the new Warren-bot endpoint (telegram_link_tokens table) and
  // the older Notifications endpoint (user_settings.telegram_link_token).
  // Telegram only knows about one webhook URL, so we must accept both here —
  // otherwise users who connect from Profile → Notifications get a misleading
  // "link invalid or expired" message even on a fresh, valid token.
  let userId = await consumeLinkToken(arg);
  let legacyLanguage: string | null = null;
  if (!userId) {
    const legacy = await completeTelegramLink(arg, chatId);
    if (legacy) {
      userId = legacy.userId;
      legacyLanguage = legacy.language;
    }
  }
  if (!userId) {
    const i = localizeTelegram(inferLocale(langCode));
    await sendMd(bot, chatId, escapeMarkdown(i.linkTokenInvalid));
    return;
  }
  const user = await findUserById(userId);
  if (!user) {
    const i = localizeTelegram(inferLocale(langCode));
    await sendMd(bot, chatId, escapeMarkdown(i.linkTokenInvalid));
    return;
  }

  // Resolve the user's preferred language from settings.
  const settings = await getUserSettings(userId).catch(() => null);
  const finalLang = legacyLanguage || settings?.language || inferLocale(langCode);

  await linkChat({
    chatId,
    userId,
    languageCode: finalLang,
  });

  const i = localizeTelegram(finalLang as TelegramLocale);
  const greeting = i.linkSuccess(user.display_name || user.username || "");
  await sendMd(bot, chatId, escapeMarkdown(greeting));
  await sendMd(bot, chatId, renderHelpMenu(buildHelp(i)));
}

// ────────────────────────────── Warren turn ──────────────────────────────

async function runWarrenForMessage(
  bot: TelegramClient,
  message: TelegramMessage,
  link: TelegramChatLink,
): Promise<void> {
  const chatId = String(message.chat.id);
  const text = (message.text || "").trim();
  await runWarrenForText(bot, link, text, message.from?.language_code);
  // appendChatMessage for the user is done inside runWarrenForText
  void chatId;
}

interface RunWarrenForTextOptions {
  /** When true, after the text reply is sent we also synthesize speech and
   *  send it as a Telegram voice note. Used for incoming voice notes. */
  replyAsVoice?: boolean;
  /** Multimodal replacement for the latest user turn (DB row stays plain text). */
  lastUserModelContent?: UserContent;
}

async function runWarrenForText(
  bot: TelegramClient,
  link: TelegramChatLink,
  userText: string,
  fallbackLanguage?: string,
  options: RunWarrenForTextOptions = {},
): Promise<void> {
  const chatId = link.chatId;
  const userId = link.userId;
  const language = link.languageCode || inferLocale(fallbackLanguage);
  const i = localizeTelegram(language as TelegramLocale);

  // Persist the inbound user message before doing anything async-expensive.
  await appendChatMessage({ chatId, role: "user", content: userText });

  // Quota check — same `ai_consult` as the web Warren.
  const quota = await requireFeatureQuotaByUserId(userId, "ai_consult");
  if (!quota.allowed) {
    const reason = quota.reason === "quota_exceeded" ? i.quotaExceeded : i.userNotFound;
    await sendMd(bot, chatId, escapeMarkdown(reason));
    return;
  }

  await bot.sendChatAction(chatId, "typing");

  // Send a single "status" message we can edit in place as Warren calls
  // each tool ("Looking up your holdings…", "Fetching live quote…"). The
  // labels come from `emitStep(label)` inside each tool, surfaced via the
  // `tool_step` frame on Warren's stream — same source of truth as the
  // web drawer. If the send fails (network), we degrade silently to the
  // typing dot only.
  const status = await bot.sendMessage(chatId, i.thinking);
  const statusMessageId = status?.message_id ?? null;
  let lastStatusText = i.thinking;

  // Resolve active portfolio (last used wins, default otherwise).
  let activePortfolioId = link.lastActivePortfolioId || "";
  let activePortfolioName = "";
  let baseCurrency = "EUR";
  try {
    const portfolios = await listPortfolios(userId);
    if (activePortfolioId && !portfolios.some((p) => p.id === activePortfolioId)) {
      activePortfolioId = ""; // stale id → fall back to default
    }
    let active = portfolios.find((p) => p.id === activePortfolioId);
    if (!active) active = portfolios.find((p) => p.isDefault) || portfolios[0];
    if (active) {
      activePortfolioId = active.id;
      activePortfolioName = active.name;
      baseCurrency = active.currency || "EUR";
      await setChatActivePortfolio(chatId, active.id);
    }
  } catch {
    // tolerate; we'll just call the model without portfolio context
  }

  // Build the snapshot server-side. If it fails we still continue without
  // it — Warren will use tools to read from DB instead.
  let snapshot;
  try {
    snapshot = await buildPortfolioSnapshot({
      userId,
      portfolioId: activePortfolioId || undefined,
      baseCurrency,
    });
  } catch (err) {
    console.warn("[telegram] snapshot build failed", err);
    snapshot = undefined;
  }

  const linkedUser = await Promise.resolve(findUserById(userId)).catch(() => null);
  const subscriptionPlan = (linkedUser?.plan ?? "free") as SubscriptionPlan;

  const holdingsCount =
    snapshot?.holdingsCount ??
    (await countHoldings(userId, activePortfolioId || undefined).catch(() => 0));
  const emptyAddStockOnly = holdingsCount === 0;

  if (emptyAddStockOnly) {
    const burst = await checkWarrenEmptyAddRateLimit(userId, linkedUser?.role);
    if (!burst.allowed) {
      await refundFeatureQuota(userId, "ai_consult");
      const minutes = Math.max(1, Math.ceil(burst.retryAfterSec / 60));
      if (statusMessageId) {
        await bot
          .editMessageText(
            chatId,
            statusMessageId,
            `You've used ${WARREN_EMPTY_ADD_MAX_CONSULTS} add-stock chats with Warren. Take a ${minutes}-minute break and try again.`,
          )
          .catch(() => {});
      } else {
        await sendMd(
          bot,
          chatId,
          escapeMarkdown(
            `You've used ${WARREN_EMPTY_ADD_MAX_CONSULTS} add-stock chats with Warren. Take a ${minutes}-minute break and try again.`,
          ),
        );
      }
      return;
    }
  }

  const officeIdentity = emptyAddStockOnly
    ? null
    : await resolveOfficeIdentity(userId).catch(() => null);

  // Load rolling history so multi-turn context survives.
  const history = await loadChatMessages(chatId, 20);
  const messages: ModelMessage[] = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  if (options.lastUserModelContent !== undefined) {
    const last = messages[messages.length - 1];
    if (last?.role === "user") {
      last.content = options.lastUserModelContent;
    }
  }
  // The latest user message is already at the end via appendChatMessage above.

  const systemAppendix = emptyAddStockOnly
    ? null
    : await buildWarrenPrefetchAppendix(userText, {
        userId,
        portfolioId: activePortfolioId || undefined,
        snapshot,
      });

  let result;
  try {
    result = await runWarrenTurn({
      userId,
      isDemo: false,
      channel: "telegram",
      language,
      baseCurrency,
      activePortfolioId: activePortfolioId || undefined,
      activePortfolioName: activePortfolioName || undefined,
      snapshot,
      officeIdentity,
      messages,
      subscriptionPlan,
      systemAppendix: systemAppendix ?? undefined,
      emptyAddStockOnly,
      onFrame: statusMessageId
        ? (frame) => {
            // Only the per-tool labels drive the visible status. We ignore
            // text deltas here on purpose — the agent's prose is sent as
            // its own message(s) below, after the status is removed.
            if (frame.kind !== "tool_step") return;
            const next = frame.label?.trim();
            if (!next || next === lastStatusText) return;
            lastStatusText = next;
            // Fire-and-forget: progress UX must never block the agent loop
            // and "message is not modified" / network errors are harmless.
            void bot.editMessageText(chatId, statusMessageId, next).catch(() => {});
          }
        : undefined,
    });
  } catch {
    if (statusMessageId) {
      await bot.deleteMessage(chatId, statusMessageId).catch(() => {});
    }
    await sendMd(bot, chatId, escapeMarkdown(i.aiError));
    return;
  }

  // Replace the status message with the actual reply. Delete-then-send
  // (vs editing in place) keeps charts, MarkdownV2 prose and inline
  // proposal keyboards working uniformly through the existing pipeline.
  if (statusMessageId) {
    await bot.deleteMessage(chatId, statusMessageId).catch(() => {});
  }

  // Render response: card parts first (text bars / summaries), then prose.
  // Must send every part — an older bug used `.slice(0, 1)` and dropped charts.
  const maxCardParts = 5;
  for (const part of result.parts.slice(0, maxCardParts)) {
    if (part.kind === "chart") {
      const sent = await sendChartPart(bot, chatId, part.data);
      if (!sent) {
        // Fall back to a text label so the user knows a chart was attempted.
        await sendMd(bot, chatId, bold(part.data.title));
      }
      continue;
    }
    const md = renderWarrenPart(part);
    if (md) await sendMd(bot, chatId, md);
  }

  if (result.text.trim()) {
    // The model writes standard Markdown (`### Heading`, `**bold**`,
    // bullets, links). Convert to Telegram MarkdownV2 so it renders with
    // styling instead of showing literal `###` and `**`.
    const md = commonMarkToTelegram(result.text);
    const chunks = splitForTelegram(md);
    for (const chunk of chunks) {
      await sendMd(bot, chatId, chunk);
    }
    await appendChatMessage({ chatId, role: "assistant", content: result.text });

    // If the user spoke to Warren, speak the answer back. Best-effort:
    // any TTS failure is silent — the text reply already went out.
    if (options.replyAsVoice) {
      await maybeSendVoiceReply(bot, chatId, result.text, language, i.voiceDisclaimerSpoken);
    }

    if (subscriptionPlan === "free") {
      await sendMd(bot, chatId, escapeMarkdown(i.warrenUpgradeModelHint));
    }
  }

  // Render proposals last so the inline keyboard is at the bottom.
  for (const proposal of result.proposals) {
    const persisted = await savePendingProposal({
      chatId,
      userId,
      kind: proposal.kind,
      data: proposal.data,
      summary: proposal.title,
    });
    const proposalForRender: WarrenProposal = { ...proposal, id: persisted.id };
    const { text, keyboard } = renderWarrenProposal(proposalForRender, {
      confirm: i.confirm,
      cancel: i.cancel,
      destructive: proposal.destructive ? i.confirmDestructive : undefined,
    });
    await bot.sendMessage(chatId, text, {
      parseMode: "MarkdownV2",
      replyMarkup: keyboard,
    });
  }
}

async function maybeSendVoiceReply(
  bot: TelegramClient,
  chatId: string,
  markdownText: string,
  language: string,
  spokenDisclaimer: string,
): Promise<void> {
  const plain = stripMarkdownForPlain(markdownText);
  if (!plain) return;
  // Prepend a one-sentence audio disclaimer so the spoken reply still
  // carries the "AI assistance, not advice" reminder.
  const speakable = `${spokenDisclaimer} ${plain}`;
  await bot.sendChatAction(chatId, "upload_voice");
  const speech = await synthesizeSpeech({ text: speakable, language });
  if (!speech.ok) return;
  await bot.sendVoice(chatId, speech.buffer);
}

// ────────────────────────────── Callbacks ──────────────────────────────

async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  const bot = getTelegramClient();
  const data = query.data || "";
  const chatId = String(query.message?.chat?.id || "");
  const messageId = query.message?.message_id;
  if (!chatId || !messageId) {
    await bot.answerCallbackQuery(query.id);
    return;
  }

  const link = await getChatLinkByChatId(chatId);
  if (!link) {
    await bot.answerCallbackQuery(query.id, "Not linked");
    return;
  }
  const i = await localeForLink(link, query.from.language_code);

  const decoded = decodeProposalCallback(data);
  if (!decoded) {
    await bot.answerCallbackQuery(query.id);
    return;
  }
  const proposalId = decoded.id;
  const isConfirm = decoded.decision === "confirm";

  const proposal = await getPendingProposal(proposalId);
  if (!proposal) {
    await bot.answerCallbackQuery(query.id, i.proposalExpired, true);
    await bot.editMessageText(
      chatId,
      messageId,
      escapeMarkdown(i.proposalExpired),
      { parseMode: "MarkdownV2" },
    );
    return;
  }
  if (proposal.userId !== link.userId) {
    await bot.answerCallbackQuery(query.id);
    return;
  }
  if (proposal.status !== "pending") {
    await bot.answerCallbackQuery(query.id, i.proposalAlreadyHandled, true);
    return;
  }
  const expiresAt = new Date(proposal.expiresAt).getTime();
  if (Number.isFinite(expiresAt) && expiresAt < Date.now()) {
    await updateProposalStatus(proposalId, "expired");
    await bot.answerCallbackQuery(query.id, i.proposalExpired, true);
    await bot.editMessageText(
      chatId,
      messageId,
      escapeMarkdown(i.proposalExpired),
      { parseMode: "MarkdownV2" },
    );
    return;
  }

  if (!isConfirm) {
    await updateProposalStatus(proposalId, "cancelled");
    await bot.answerCallbackQuery(query.id, i.cancelled);
    await bot.editMessageText(
      chatId,
      messageId,
      `${escapeMarkdown(i.cancelled)} — ${italic(proposal.summary || proposal.kind)}`,
      { parseMode: "MarkdownV2" },
    );
    return;
  }

  const data_ = safeParse(proposal.dataJson);
  const result = await dispatchProposal(
    link.userId,
    proposal.kind as WarrenProposalKind,
    data_,
  );
  if (result.ok) {
    await updateProposalStatus(proposalId, "confirmed");
    await bot.answerCallbackQuery(query.id, i.confirmed);
    await bot.editMessageText(
      chatId,
      messageId,
      `${escapeMarkdown("✅ " + i.confirmed)}\n${escapeMarkdown(result.message || proposal.summary)}`,
      { parseMode: "MarkdownV2" },
    );
  } else {
    await bot.answerCallbackQuery(query.id, i.actionFailed, true);
    await bot.editMessageText(
      chatId,
      messageId,
      `${escapeMarkdown("⚠️ " + i.actionFailed)}\n${escapeMarkdown(result.error || "")}`,
      { parseMode: "MarkdownV2" },
    );
  }
}

// ────────────────────────────── Helpers ──────────────────────────────

async function sendMd(bot: TelegramClient, chatId: string, text: string): Promise<void> {
  if (!text) return;
  const chunks = splitForTelegram(text);
  for (const chunk of chunks) {
    await bot.sendMessage(chatId, chunk, { parseMode: "MarkdownV2" });
  }
}

async function resolvePortfolio(link: TelegramChatLink): Promise<string> {
  if (link.lastActivePortfolioId) return link.lastActivePortfolioId;
  const p = await getDefaultPortfolio(link.userId);
  return p.id;
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function inferLocale(code?: string): TelegramLocale {
  if (!code) return "en";
  const head = code.slice(0, 2).toLowerCase();
  return (head === "es" ? "es" : "en") as TelegramLocale;
}

async function localeForLink(
  link: TelegramChatLink,
  fallbackCode?: string,
) {
  const lang = (link.languageCode || inferLocale(fallbackCode)) as TelegramLocale;
  return localizeTelegram(lang);
}

function buildHelp(i: ReturnType<typeof localizeTelegram>): HelpStrings {
  return {
    title: i.helpTitle,
    intro: i.helpIntro,
    sections: [
      {
        heading: i.helpPortfolio,
        items: [
          "/holdings",
          "/portfolios",
          "/chart",
          i.helpEx1,
          i.helpEx2,
        ],
      },
      {
        heading: i.helpGrowth,
        items: ["/growth", i.helpEx3, i.helpEx4],
      },
      {
        heading: i.helpDividendsNews,
        items: ["/news", "/dividends", i.helpEx5],
      },
      {
        heading: i.helpAlerts,
        items: ["/alerts", i.helpEx6],
      },
      {
        heading: i.helpWatchlist,
        items: ["/watchlist", i.helpEx7],
      },
      {
        heading: i.helpOffice,
        items: ["/office"],
      },
      {
        heading: i.helpWrites,
        items: [i.helpEx8, i.helpEx9, i.helpEx10],
      },
      {
        heading: i.helpAccount,
        items: ["/lang es", "/unlink"],
      },
    ],
    disclaimer: i.helpDisclaimer,
  };
}
