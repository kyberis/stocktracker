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
  loadChatMessages,
  setChatLanguage,
  savePendingProposal,
  setChatActivePortfolio,
  touchChatLastSeen,
  unlinkChat,
  updateProposalStatus,
  type TelegramChatLink,
} from "@/lib/db";
import { requireFeatureQuotaByUserId } from "@/lib/auth/guards";
import { runWarrenTurn } from "@/lib/ai/warren/run-turn";
import { buildPortfolioSnapshot } from "@/lib/ai/warren/build-snapshot";
import { dispatchProposal } from "@/lib/ai/warren/dispatch";
import type { WarrenProposal, WarrenProposalKind } from "@/lib/ai/warren/types";
import {
  bold,
  escapeMarkdown,
  italic,
  renderHelpMenu,
  renderWarrenPart,
  renderWarrenProposal,
  splitForTelegram,
  type HelpStrings,
} from "./format";
import {
  getTelegramBotUsername,
  getTelegramClient,
  type TelegramClient,
} from "./client";
import { localizeTelegram, type TelegramLocale } from "./i18n";

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

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number; type: string };
  date: number;
  text?: string;
  entities?: Array<{ type: string; offset: number; length: number }>;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

const TELEGRAM_FLAG = "telegram_bot_enabled";

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
  if (!text) return;

  const bot = getTelegramClient();
  const link = await getChatLinkByChatId(chatId);
  if (link) await touchChatLastSeen(chatId);

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

async function runWarrenForText(
  bot: TelegramClient,
  link: TelegramChatLink,
  userText: string,
  fallbackLanguage?: string,
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

  // Load rolling history so multi-turn context survives.
  const history = await loadChatMessages(chatId, 20);
  const messages = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  // The latest user message is already at the end via appendChatMessage above.

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
      messages,
    });
  } catch {
    await sendMd(bot, chatId, escapeMarkdown(i.aiError));
    return;
  }

  // Render response: card parts first (text bars / summaries), then prose.
  // Must send every part — an older bug used `.slice(0, 1)` and dropped charts.
  const maxCardParts = 5;
  for (const part of result.parts.slice(0, maxCardParts)) {
    const md = renderWarrenPart(part);
    if (md) await sendMd(bot, chatId, md);
  }

  if (result.text.trim()) {
    const escaped = escapeMarkdown(result.text);
    const chunks = splitForTelegram(escaped);
    for (const chunk of chunks) {
      await sendMd(bot, chatId, chunk);
    }
    await appendChatMessage({ chatId, role: "assistant", content: result.text });
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

  // Format: p:<id>:y or p:<id>:n
  const m = /^p:([A-Za-z0-9_\-]+):(y|n)$/.exec(data);
  if (!m) {
    await bot.answerCallbackQuery(query.id);
    return;
  }
  const proposalId = m[1];
  const isConfirm = m[2] === "y";

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
