/**
 * Telegram MarkdownV2 rendering helpers and translation of Warren cards
 * (`WarrenPart`, `WarrenProposal`) into Telegram-friendly messages.
 *
 * MarkdownV2 reference: https://core.telegram.org/bots/api#markdownv2-style
 *
 * Special chars that MUST be escaped EVERYWHERE in MarkdownV2:
 *   _ * [ ] ( ) ~ ` > # + - = | { } . !
 *
 * To keep things simple we do all formatting via this module and treat all
 * user-supplied text as plain content that needs escaping. Bold is the only
 * styling we use frequently; for that we wrap unescaped content in `*…*`.
 */

import {
  chunkMessage,
  escapeMarkdownV2,
  markdownToTelegramMarkdownV2,
  stripMarkdown,
  TELEGRAM_HARD_LIMIT,
} from "@kyberis/agent-os/channels";
import { encodeProposalCallback } from "@kyberis/agent-os/safety";

import type { WarrenPart, WarrenProposal } from "@/lib/ai/warren/types";

const SPLIT_TARGET = 3500;

/** Escape every MarkdownV2 special character. Safe for any user text. */
export function escapeMarkdown(text: string): string {
  return escapeMarkdownV2(text);
}

/** Build a `*bold*` span where the inner text is auto-escaped. */
export function bold(text: string): string {
  return `*${escapeMarkdown(text)}*`;
}

/** Build a `_italic_` span where the inner text is auto-escaped. */
export function italic(text: string): string {
  return `_${escapeMarkdown(text)}_`;
}

/** Build a fixed-width inline `\`code\`` span. */
export function code(text: string): string {
  // Inside inline code, only ` and \ need escaping.
  return `\`${text.replace(/([`\\])/g, "\\$1")}\``;
}

/**
 * Build a horizontal bar in the form `█████░░░░░ 64%`. `pct` is 0–100.
 * Uses fixed-width block chars so the result aligns inside Telegram's
 * monospace blocks. Returns plain text (already MarkdownV2-safe except for
 * `%`/`-` which the caller must escape if used outside `code(...)`).
 */
export function progressBar(pct: number, totalCells = 12): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * totalCells);
  return "█".repeat(filled) + "░".repeat(totalCells - filled);
}

/** Format a number as a localized currency-ish string with a fixed thousand separator. */
export function fmtNumber(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  const fixed = abs.toFixed(decimals);
  const [int, dec] = fixed.split(".");
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = n < 0 ? "-" : "";
  return dec ? `${sign}${withSep}.${dec}` : `${sign}${withSep}`;
}

export function fmtMoney(n: number, currency: string, decimals = 2): string {
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] || "";
  if (symbol) return `${symbol}${fmtNumber(n, decimals)}`;
  return `${fmtNumber(n, decimals)} ${currency.toUpperCase()}`;
}

export function fmtSignedPct(pct: number, decimals = 2): string {
  const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "•";
  const sign = pct > 0 ? "+" : "";
  return `${arrow} ${sign}${fmtNumber(pct, decimals)}%`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  JPY: "¥",
  CHF: "CHF ",
};

/**
 * Convert CommonMark-style Markdown produced by the AI (the same syntax
 * ChatGPT/Claude emit by default) into Telegram MarkdownV2.
 *
 * Why this exists: Warren produces standard Markdown in `result.text`, but
 * Telegram's MarkdownV2 has a different syntax (`*` for bold instead of `**`)
 * and a long list of mandatory escape characters. Naively running
 * `escapeMarkdown(text)` makes Telegram render `### Adobe` and `**Price**` as
 * literal text.
 *
 * The translation now lives in `@kyberis/agent-os/channels`, shared with Clara
 * and Will — a missed escape used to be three separate bugs.
 */
export function commonMarkToTelegram(input: string): string {
  return markdownToTelegramMarkdownV2(input);
}

/**
 * Strip CommonMark-ish formatting so the text can be handed to a TTS engine or
 * any other plain-text consumer. Bullet markers become a leading dash so the
 * spoken cadence stays natural.
 */
export function stripMarkdownForPlain(input: string): string {
  return stripMarkdown(input);
}

/**
 * Split a long MarkdownV2 message into Telegram-sized chunks. Warren aims at
 * 3500 characters for headroom but only starts splitting once the transport's
 * 4096 ceiling is actually breached. Paragraph boundaries win over line
 * boundaries.
 */
export function splitForTelegram(text: string, target = SPLIT_TARGET): string[] {
  return chunkMessage(text, {
    max: target,
    hardLimit: TELEGRAM_HARD_LIMIT,
    preferParagraphs: true,
  });
}

// ─────────────────────────── Warren parts → messages ───────────────────────

export function renderWarrenPart(part: WarrenPart): string {
  switch (part.kind) {
    case "summary":
      return renderSummary(part.data);
    case "holding":
      return renderHolding(part.data);
    case "allocation":
      return renderAllocation(part.data);
    case "stockSnapshot":
      return renderSnapshot(part.data);
    case "stockPick":
      return renderStockPick(part.data);
    case "tradeGuidance":
      return renderTradeGuidance(part.data);
    default:
      return "";
  }
}

function renderSummary(data: {
  totalValue?: number;
  dayChange?: number;
  dayChangePct?: number;
  holdingsCount: number;
  topHoldings?: Array<{ ticker: string; pct: number }>;
  currency?: string;
}): string {
  const lines: string[] = [];
  lines.push(bold("Portfolio summary"));
  if (typeof data.totalValue === "number") {
    lines.push(`Total: ${escapeMarkdown(fmtMoney(data.totalValue, data.currency || "EUR"))}`);
  }
  if (typeof data.dayChange === "number" && typeof data.dayChangePct === "number") {
    lines.push(
      `Today: ${escapeMarkdown(fmtMoney(data.dayChange, data.currency || "EUR"))} \\(${escapeMarkdown(
        fmtSignedPct(data.dayChangePct),
      )}\\)`,
    );
  }
  lines.push(`Holdings: ${data.holdingsCount}`);
  if (data.topHoldings && data.topHoldings.length > 0) {
    lines.push("");
    lines.push(bold("Top positions"));
    for (const h of data.topHoldings.slice(0, 5)) {
      lines.push(`• ${escapeMarkdown(h.ticker)} — ${escapeMarkdown(fmtNumber(h.pct, 1))}%`);
    }
  }
  return lines.join("\n");
}

function renderHolding(data: {
  ticker: string;
  name?: string;
  shares?: number;
  avgPrice?: number;
  currentPrice?: number;
  currency?: string;
  changePct?: number;
}): string {
  const lines: string[] = [];
  const title = data.name ? `${data.ticker} — ${data.name}` : data.ticker;
  lines.push(bold(title));
  if (typeof data.shares === "number") {
    lines.push(`Shares: ${escapeMarkdown(fmtNumber(data.shares, 4))}`);
  }
  if (typeof data.currentPrice === "number") {
    lines.push(
      `Price: ${escapeMarkdown(fmtMoney(data.currentPrice, data.currency || "EUR"))}` +
        (typeof data.changePct === "number"
          ? ` \\(${escapeMarkdown(fmtSignedPct(data.changePct))}\\)`
          : ""),
    );
  }
  if (typeof data.avgPrice === "number") {
    lines.push(`Avg cost: ${escapeMarkdown(fmtMoney(data.avgPrice, data.currency || "EUR"))}`);
  }
  return lines.join("\n");
}

function renderAllocation(data: {
  items: Array<{ label: string; pct: number }>;
  totalValue?: number;
  currency?: string;
}): string {
  const lines: string[] = [bold("Allocation")];
  const sorted = [...data.items].sort((a, b) => b.pct - a.pct);
  // Pad labels to align bars.
  const widest = Math.min(12, sorted.reduce((m, it) => Math.max(m, it.label.length), 0));
  for (const it of sorted) {
    const labelPadded = it.label.padEnd(widest, " ").slice(0, widest);
    const bar = progressBar(it.pct, 10);
    lines.push(
      `\`${escapeMarkdown(labelPadded)}\` ${bar} ${escapeMarkdown(fmtNumber(it.pct, 1))}%`,
    );
  }
  if (typeof data.totalValue === "number") {
    lines.push("");
    lines.push(`Total: ${escapeMarkdown(fmtMoney(data.totalValue, data.currency || "EUR"))}`);
  }
  return lines.join("\n");
}

function renderSnapshot(data: {
  ticker: string;
  name?: string;
  price?: number;
  currency?: string;
  changePct?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}): string {
  const lines: string[] = [];
  const title = data.name ? `${data.ticker} — ${data.name}` : data.ticker;
  lines.push(bold(title));
  if (typeof data.price === "number") {
    let priceLine = `Price: ${escapeMarkdown(fmtMoney(data.price, data.currency || "USD"))}`;
    if (typeof data.changePct === "number") {
      priceLine += ` \\(${escapeMarkdown(fmtSignedPct(data.changePct))}\\)`;
    }
    lines.push(priceLine);
  }
  if (typeof data.fiftyTwoWeekHigh === "number" && typeof data.fiftyTwoWeekLow === "number") {
    lines.push(
      `52w range: ${escapeMarkdown(fmtNumber(data.fiftyTwoWeekLow))} – ${escapeMarkdown(
        fmtNumber(data.fiftyTwoWeekHigh),
      )}`,
    );
  }
  return lines.join("\n");
}

function renderStockPick(data: { ticker: string; name?: string; rationale?: string }): string {
  const lines: string[] = [];
  const title = data.name ? `${data.ticker} — ${data.name}` : data.ticker;
  lines.push(bold(title));
  if (data.rationale) lines.push(escapeMarkdown(data.rationale));
  return lines.join("\n");
}

function renderTradeGuidance(data: {
  ticker: string;
  name?: string;
  action: "buy" | "sell" | "trim" | "hold";
  currentPrice?: number;
  currency?: string;
  changePct?: number;
  valuationLabel?: "expensive" | "fair" | "cheap";
  upsideToTargetPct?: number;
  suggestedShares?: number;
  suggestedAmount?: number;
  rationale: string;
}): string {
  const actionLabel = { buy: "Buy", sell: "Sell", trim: "Trim", hold: "Hold" }[data.action];
  const lines: string[] = [bold(`${actionLabel} guidance — ${data.ticker}`)];
  if (data.name) lines.push(escapeMarkdown(data.name));
  if (typeof data.currentPrice === "number") {
    let priceLine = `Price: ${escapeMarkdown(fmtMoney(data.currentPrice, data.currency || "EUR"))}`;
    if (typeof data.changePct === "number") {
      priceLine += ` \\(${escapeMarkdown(fmtSignedPct(data.changePct))}\\)`;
    }
    lines.push(priceLine);
  }
  if (data.valuationLabel) {
    lines.push(`Valuation: ${escapeMarkdown(data.valuationLabel)}`);
  }
  if (typeof data.upsideToTargetPct === "number") {
    lines.push(`Upside to target: ${escapeMarkdown(fmtSignedPct(data.upsideToTargetPct))}`);
  }
  if (typeof data.suggestedShares === "number") {
    lines.push(`Suggested size: ${escapeMarkdown(fmtNumber(data.suggestedShares, 4))} shares`);
  }
  if (typeof data.suggestedAmount === "number") {
    lines.push(
      `Est. value: ${escapeMarkdown(fmtMoney(data.suggestedAmount, data.currency || "EUR"))}`,
    );
  }
  lines.push(escapeMarkdown(data.rationale));
  lines.push(italic("Analysis only — trefolio does not execute trades."));
  return lines.join("\n");
}

// ─────────────────────────── Proposals (Confirm/Cancel) ────────────────────

export interface ProposalKeyboardLabels {
  confirm: string;
  cancel: string;
  destructive?: string;
}

export function renderWarrenProposal(
  proposal: WarrenProposal,
  labels: ProposalKeyboardLabels,
): { text: string; keyboard: { inline_keyboard: { text: string; callback_data: string }[][] } } {
  const lines: string[] = [];
  const titleEmoji = proposal.destructive ? "⚠️" : "📝";
  lines.push(`${titleEmoji} ${bold(proposal.title)}`);
  if (proposal.summary) {
    lines.push(escapeMarkdown(proposal.summary));
  }
  if (proposal.rows.length > 0) {
    lines.push("");
    for (const row of proposal.rows) {
      lines.push(`• ${bold(row.label)}: ${escapeMarkdown(row.value)}`);
    }
  }
  lines.push("");
  lines.push(italic("Tap Confirm to apply, Cancel to discard."));

  const confirmLabel = proposal.destructive
    ? labels.destructive || labels.confirm
    : labels.confirm;
  const keyboard = {
    inline_keyboard: [
      [
        { text: confirmLabel, callback_data: encodeProposalCallback(proposal.id, "confirm") },
        { text: labels.cancel, callback_data: encodeProposalCallback(proposal.id, "cancel") },
      ],
    ],
  };

  return { text: lines.join("\n"), keyboard };
}

// ─────────────────────────── Help / capability menu ────────────────────────

export interface HelpStrings {
  title: string;
  intro: string;
  sections: { heading: string; items: string[] }[];
  disclaimer: string;
}

export function renderHelpMenu(s: HelpStrings): string {
  const lines: string[] = [];
  lines.push(bold(s.title));
  lines.push(escapeMarkdown(s.intro));
  for (const sec of s.sections) {
    lines.push("");
    lines.push(bold(sec.heading));
    for (const item of sec.items) {
      lines.push(`• ${escapeMarkdown(item)}`);
    }
  }
  lines.push("");
  lines.push(italic(s.disclaimer));
  return lines.join("\n");
}
