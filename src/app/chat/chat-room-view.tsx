"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Send, ImagePlus, Camera, Clock, AlertTriangle, Loader2,
  Link as LinkIcon, Users, Pencil, Reply, X, ChevronLeft, CheckCheck,
  Pin, Share2, MoreVertical, Trash2, SmilePlus, Plus, Mic, FileAudio,
} from "lucide-react";
import dynamic from "next/dynamic";

const SharePortfolioModal = dynamic(() => import("./share-portfolio-modal"), { ssr: false });
const TickerPreviewPanel = dynamic(() => import("./ticker-preview-panel"), { ssr: false });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatMessageType =
  | "text"
  | "link"
  | "image"
  | "audio"
  | "holding"
  | "allocation"
  | "summary"
  | "stock_pick";

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: ChatMessageType;
  content: string;
  createdAt: string;
  expiresAt: string;
  replyToId: string;
  editedAt: string;
  isPersistent: boolean;
}

interface ChatReaction {
  emoji: string;
  userIds: string[];
}

interface ChatRoomData {
  id: string;
  createdBy: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  kind?: string;
}

interface Participant {
  userId: string;
  displayName: string;
  avatarUrl: string;
  joinedAt: string;
  lastTypingAt: string;
  lastSeenAt: string;
  lastReadMsgId: string;
  membershipStatus?: string;
}

// ---------------------------------------------------------------------------
// Color palette for distinguishing senders
// ---------------------------------------------------------------------------

export const USER_COLORS = [
  { bg: "bg-teal-100 dark:bg-teal-900/60", text: "text-teal-800 dark:text-teal-200", name: "text-teal-700 dark:text-teal-300", ring: "ring-teal-400" },
  { bg: "bg-rose-100 dark:bg-rose-900/60", text: "text-rose-800 dark:text-rose-200", name: "text-rose-700 dark:text-rose-300", ring: "ring-rose-400" },
  { bg: "bg-amber-100 dark:bg-amber-900/60", text: "text-amber-800 dark:text-amber-200", name: "text-amber-700 dark:text-amber-300", ring: "ring-amber-400" },
  { bg: "bg-violet-100 dark:bg-violet-900/60", text: "text-violet-800 dark:text-violet-200", name: "text-violet-700 dark:text-violet-300", ring: "ring-violet-400" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/60", text: "text-emerald-800 dark:text-emerald-200", name: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-400" },
  { bg: "bg-sky-100 dark:bg-sky-900/60", text: "text-sky-800 dark:text-sky-200", name: "text-sky-700 dark:text-sky-300", ring: "ring-sky-400" },
  { bg: "bg-orange-100 dark:bg-orange-900/60", text: "text-orange-800 dark:text-orange-200", name: "text-orange-700 dark:text-orange-300", ring: "ring-orange-400" },
  { bg: "bg-fuchsia-100 dark:bg-fuchsia-900/60", text: "text-fuchsia-800 dark:text-fuchsia-200", name: "text-fuchsia-700 dark:text-fuchsia-300", ring: "ring-fuchsia-400" },
];

export function userColorIndex(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return Math.abs(hash) % USER_COLORS.length;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 3000;
const TYPING_HEARTBEAT_MS = 2000;
const TYPING_VISIBLE_MS = 4000;
const ONLINE_THRESHOLD_MS = 15_000;

export function isParticipantOnline(lastSeenAt: string): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt + "Z").getTime() < ONLINE_THRESHOLD_MS;
}

function lastSeenText(lastSeenAt: string): string {
  if (!lastSeenAt) return "Offline";
  const diff = Date.now() - new Date(lastSeenAt + "Z").getTime();
  if (diff < ONLINE_THRESHOLD_MS) return "Online";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Last seen just now";
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(hours / 24)}d ago`;
}

function timeUntilExpiry(expiresAt: string): string {
  const diff = new Date(expiresAt + "Z").getTime() - Date.now();
  if (diff <= 0) return "expired";
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function isUrl(text: string): boolean {
  try {
    const u = new URL(text);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const MAX_RECORDING_SEC = 60;

function formatVoiceDurationMmSs(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function tryParseAudioPayload(content: string): { url: string; durationSec: number } | null {
  try {
    const o = JSON.parse(content) as { url?: unknown; durationSec?: unknown };
    if (typeof o.url === "string" && typeof o.durationSec === "number" && Number.isFinite(o.durationSec)) {
      return { url: o.url, durationSec: o.durationSec };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Best-effort duration from blob URL; WebM/Opus often reports 0 or Infinity until fully buffered — returns 0 so callers can use wall-clock fallback. */
function getBlobDurationSeconds(objectUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const a = document.createElement("audio");
    a.preload = "metadata";
    let settled = false;
    const finish = (d: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const ok = Number.isFinite(d) && d > 0 && d !== Infinity;
      resolve(ok ? d : 0);
    };
    const timeout = setTimeout(() => finish(0), 4000);
    a.onloadedmetadata = () => {
      const d = a.duration;
      if (Number.isFinite(d) && d > 0 && d !== Infinity) finish(d);
    };
    a.ondurationchange = () => {
      const d = a.duration;
      if (Number.isFinite(d) && d > 0 && d !== Infinity) finish(d);
    };
    a.oncanplaythrough = () => {
      const d = a.duration;
      if (Number.isFinite(d) && d > 0 && d !== Infinity) finish(d);
    };
    a.onerror = () => finish(0);
    a.src = objectUrl;
    try {
      a.load();
    } catch {
      finish(0);
    }
  });
}

function pickRecordingMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

const TICKER_SPLIT_RE = /(\$[A-Z]{1,5}(?:\.[A-Z]{1,3})?)\b/g;
const TICKER_TEST_RE = /^\$[A-Z]{1,5}(?:\.[A-Z]{1,3})?$/;

function renderTextWithTickers(text: string, isOwn: boolean, onTickerClick?: (symbol: string) => void): React.ReactNode {
  const parts = text.split(TICKER_SPLIT_RE);
  if (parts.length === 1) return <span className="whitespace-pre-wrap">{text}</span>;
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (TICKER_TEST_RE.test(part)) {
          const symbol = part.slice(1);
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); onTickerClick?.(symbol); }}
              className={`font-semibold underline decoration-dotted underline-offset-2 cursor-pointer ${
                isOwn
                  ? "text-indigo-200 hover:text-white"
                  : "text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
              }`}
            >
              {part}
            </button>
          );
        }
        return part;
      })}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Portfolio share card types & renderers
// ---------------------------------------------------------------------------

interface HoldingCardData {
  ticker: string;
  name?: string;
  shares?: number;
  avgPrice?: number;
  currentPrice?: number;
  currency?: string;
  change?: number;
  changePct?: number;
  privacy: "full" | "anonymous" | "ticker_only";
}

interface AllocationCardData {
  items: { label: string; pct: number; color: string }[];
  totalValue?: number;
  currency?: string;
  privacy: "full" | "percentages" | "categories";
}

interface SummaryCardData {
  totalValue?: number;
  dayChange?: number;
  dayChangePct?: number;
  holdingsCount: number;
  topHoldings?: { ticker: string; pct: number }[];
  currency?: string;
  privacy: "full" | "percentages" | "count_only";
}

interface StockPickCardData {
  ticker: string;
  name?: string;
  currentPrice?: number;
  currency?: string;
  note?: string;
}

function tryParseCardJson<T>(content: string): T | null {
  try { return JSON.parse(content) as T; } catch { return null; }
}

function formatCardNumber(n: number, currency?: string): string {
  const formatted = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!currency) return formatted;
  const sym: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", CHF: "CHF ", JPY: "¥" };
  return `${sym[currency] || currency + " "}${formatted}`;
}

function HoldingCard({ data }: { data: HoldingCardData }) {
  const isAnon = data.privacy === "anonymous";
  const isTickerOnly = data.privacy === "ticker_only";
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-w-[200px] max-w-[260px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
          {data.ticker.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{data.ticker}</div>
          {data.name && !isAnon && <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{data.name}</div>}
        </div>
      </div>
      {!isTickerOnly && (
        <div className="space-y-1 text-xs">
          {data.currentPrice != null && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Price</span>
              <span className="font-medium">{formatCardNumber(data.currentPrice, data.currency)}</span>
            </div>
          )}
          {data.shares != null && !isAnon && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Shares</span>
              <span className="font-medium">{data.shares}</span>
            </div>
          )}
          {data.avgPrice != null && !isAnon && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Avg price</span>
              <span className="font-medium">{formatCardNumber(data.avgPrice, data.currency)}</span>
            </div>
          )}
          {data.changePct != null && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Change</span>
              <span className={`font-medium ${data.changePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {data.changePct >= 0 ? "+" : ""}{data.changePct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      )}
      <div className="mt-2 text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">Shared Holding</div>
    </div>
  );
}

function AllocationCard({ data }: { data: AllocationCardData }) {
  const showValues = data.privacy === "full";
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-w-[200px] max-w-[260px]">
      <div className="text-xs font-semibold mb-2">Portfolio Allocation</div>
      {showValues && data.totalValue != null && (
        <div className="text-lg font-bold mb-2">{formatCardNumber(data.totalValue, data.currency)}</div>
      )}
      <div className="flex h-3 rounded-full overflow-hidden mb-2">
        {data.items.map((item, i) => (
          <div key={i} style={{ width: `${item.pct}%`, backgroundColor: item.color }} className="min-w-[2px]" />
        ))}
      </div>
      <div className="space-y-1">
        {data.items.slice(0, 6).map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="flex-1 truncate text-gray-600 dark:text-slate-300">{data.privacy === "categories" ? "••••" : item.label}</span>
            <span className="font-medium">{item.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">Shared Allocation</div>
    </div>
  );
}

function SummaryCard({ data }: { data: SummaryCardData }) {
  const showValues = data.privacy === "full";
  const showPcts = data.privacy !== "count_only";
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-w-[200px] max-w-[260px]">
      <div className="text-xs font-semibold mb-1">Portfolio Summary</div>
      {showValues && data.totalValue != null && (
        <div className="text-lg font-bold">{formatCardNumber(data.totalValue, data.currency)}</div>
      )}
      {showPcts && data.dayChangePct != null && (
        <div className={`text-sm font-medium ${(data.dayChangePct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {data.dayChangePct >= 0 ? "+" : ""}{data.dayChangePct.toFixed(2)}%
          {showValues && data.dayChange != null && (
            <span className="text-gray-500 dark:text-slate-400 ml-1 text-xs">({data.dayChange >= 0 ? "+" : ""}{formatCardNumber(data.dayChange, data.currency)})</span>
          )}
        </div>
      )}
      <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">{data.holdingsCount} holdings</div>
      {showPcts && data.topHoldings && data.topHoldings.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {data.topHoldings.slice(0, 5).map((h, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-slate-300">{h.ticker}</span>
              <span className="font-medium">{h.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">Shared Summary</div>
    </div>
  );
}

function StockPickCard({ data }: { data: StockPickCardData }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-w-[200px] max-w-[260px]">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-300">
          {data.ticker.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{data.ticker}</div>
          {data.name && <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{data.name}</div>}
        </div>
      </div>
      {data.currentPrice != null && (
        <div className="text-sm font-bold">{formatCardNumber(data.currentPrice, data.currency)}</div>
      )}
      {data.note && <div className="mt-1 text-xs text-gray-600 dark:text-slate-300 italic">&ldquo;{data.note}&rdquo;</div>}
      <div className="mt-2 text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
        <span>⭐</span> Stock Pick
      </div>
    </div>
  );
}

function PortfolioCardRenderer({ type, content }: { type: ChatMessageType; content: string }) {
  switch (type) {
    case "holding": {
      const d = tryParseCardJson<HoldingCardData>(content);
      return d ? <HoldingCard data={d} /> : <span className="text-red-500 text-xs">Invalid holding data</span>;
    }
    case "allocation": {
      const d = tryParseCardJson<AllocationCardData>(content);
      return d ? <AllocationCard data={d} /> : <span className="text-red-500 text-xs">Invalid allocation data</span>;
    }
    case "summary": {
      const d = tryParseCardJson<SummaryCardData>(content);
      return d ? <SummaryCard data={d} /> : <span className="text-red-500 text-xs">Invalid summary data</span>;
    }
    case "stock_pick": {
      const d = tryParseCardJson<StockPickCardData>(content);
      return d ? <StockPickCard data={d} /> : <span className="text-red-500 text-xs">Invalid stock pick data</span>;
    }
    default:
      return null;
  }
}

const CARD_TYPES = new Set<ChatMessageType>(["holding", "allocation", "summary", "stock_pick"]);

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

const QUICK_EMOJIS = ["👍", "❤️", "🚀", "💎", "📈", "📉", "🐂", "🐻", "💰", "🤑", "😂", "🔥"];

interface BubbleProps {
  msg: ChatMessage;
  isOwn: boolean;
  isRead: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  color: typeof USER_COLORS[number];
  allMessages: ChatMessage[];
  reactions: ChatReaction[];
  currentUserId: string | null;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onTickerClick: (symbol: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onScrollToReply: (messageId: string) => void;
}

function MessageBubble({ msg, isOwn, isRead, isFirstInGroup, isLastInGroup, color, allMessages, reactions, currentUserId, onReply, onEdit, onTickerClick, onReact, onScrollToReply }: BubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showActions) return;
    function handleTap(e: MouseEvent | TouchEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setShowActions(false);
    }
    document.addEventListener("mousedown", handleTap);
    document.addEventListener("touchstart", handleTap);
    return () => { document.removeEventListener("mousedown", handleTap); document.removeEventListener("touchstart", handleTap); };
  }, [showActions]);
  const ttl = msg.isPersistent ? "pinned" : timeUntilExpiry(msg.expiresAt);
  const repliedMsg = msg.replyToId ? allMessages.find((m) => m.id === msg.replyToId) : null;
  const isCardMsg = CARD_TYPES.has(msg.type);

  const ownRadius = isFirstInGroup && isLastInGroup
    ? "rounded-2xl rounded-br-md"
    : isFirstInGroup
      ? "rounded-2xl rounded-br-sm"
      : isLastInGroup
        ? "rounded-2xl rounded-tr-sm rounded-br-md"
        : "rounded-2xl rounded-tr-sm rounded-br-sm";

  const otherRadius = isFirstInGroup && isLastInGroup
    ? "rounded-2xl rounded-bl-md"
    : isFirstInGroup
      ? "rounded-2xl rounded-bl-sm"
      : isLastInGroup
        ? "rounded-2xl rounded-tl-sm rounded-bl-md"
        : "rounded-2xl rounded-tl-sm rounded-bl-sm";

  return (
    <div className={`flex flex-col max-w-[75%] ${isOwn ? "self-end items-end" : "self-start items-start"}`}>
      {isFirstInGroup && !isOwn && (
        <span className={`text-xs font-medium px-1 mb-0.5 ${color.name}`}>
          {msg.senderName}
        </span>
      )}

      {repliedMsg && (
        <button
          type="button"
          onClick={() => onScrollToReply(repliedMsg.id)}
          className={`text-[11px] px-3 py-1.5 mb-0.5 rounded-lg border-l-2 text-left cursor-pointer transition-opacity hover:opacity-90 active:opacity-80 ${
            isOwn
              ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-500 text-gray-800 dark:text-slate-200"
              : "bg-gray-100 dark:bg-slate-700/50 border-gray-300 dark:border-slate-500 text-gray-600 dark:text-slate-300"
          }`}
        >
          <span className="font-medium">{repliedMsg.senderName}</span>
          <span className="ml-1 opacity-90">
            {repliedMsg.type === "image" ? "Photo"
              : repliedMsg.type === "audio" ? "Voice message"
              : CARD_TYPES.has(repliedMsg.type) ? `Shared ${repliedMsg.type.replace("_", " ")}`
              : repliedMsg.content.slice(0, 60) + (repliedMsg.content.length > 60 ? "…" : "")}
          </span>
        </button>
      )}

      <div className="group relative" ref={actionsRef}>
        {isCardMsg ? (
          <div onClick={() => setShowActions((v) => !v)}>
            <PortfolioCardRenderer type={msg.type} content={msg.content} />
          </div>
        ) : (
          <div
            onClick={() => setShowActions((v) => !v)}
            className={`px-4 py-2.5 text-sm break-words select-none ${
              msg.type === "audio"
                ? "inline-block w-fit max-w-[min(100%,320px)] shrink-0 align-top"
                : ""
            } ${
              isOwn
                ? `bg-indigo-600 text-white ${ownRadius}`
                : `${color.bg} ${color.text} ${otherRadius}`
            }`}
          >
            {msg.type === "image" ? (
              <img src={msg.content} alt="Shared image" className="max-w-full max-h-80 rounded-lg" loading="lazy" />
            ) : msg.type === "audio" ? (
              (() => {
                const a = tryParseAudioPayload(msg.content);
                return a ? (
                  /* Light chip + color-scheme: controls visible on colored bubbles. Shrink-wrapped width + fixed control height avoids WebKit stretching the <audio> to a tall strip. */
                  <div
                    className="rounded-xl bg-white px-2 py-1.5 shadow-sm ring-1 ring-black/10 dark:bg-slate-100 dark:ring-white/15 overflow-hidden w-[min(100%,280px)] max-w-[85vw]"
                    style={{ colorScheme: "light" }}
                  >
                    <audio
                      controls
                      src={a.url}
                      preload="metadata"
                      className="block w-full h-9 max-h-9 min-h-0"
                      style={{ height: 36, maxHeight: 36 }}
                      aria-label={`Voice message, ${formatVoiceDurationMmSs(a.durationSec)}`}
                    />
                  </div>
                ) : (
                  <span className="text-xs opacity-80">Voice message unavailable</span>
                );
              })()
            ) : msg.type === "link" || isUrl(msg.content) ? (
              <a
                href={msg.content} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`underline flex items-center gap-1 ${
                  isOwn ? "text-indigo-100 hover:text-white" : "text-indigo-600 dark:text-indigo-400 hover:text-indigo-800"
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                {msg.content}
              </a>
            ) : (
              renderTextWithTickers(msg.content, isOwn, onTickerClick)
            )}
          </div>
        )}

        <div className={`absolute bottom-full ${isOwn ? "right-0" : "left-0"} items-center gap-0.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-md px-1 py-0.5 pb-2 z-10 ${showActions ? "flex" : "hidden group-hover:flex"}`}>
          {QUICK_EMOJIS.slice(0, 4).map((em) => (
            <button key={em} onClick={() => { onReact(msg.id, em); setShowActions(false); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm leading-none" title={em}>
              {em}
            </button>
          ))}
          <EmojiPickerButton onSelect={(em) => { onReact(msg.id, em); setShowActions(false); }} />
          <div className="w-px h-4 bg-gray-200 dark:bg-slate-600 mx-0.5" />
          <button onClick={() => { onReply(msg); setShowActions(false); }} className="p-1 rounded text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="Reply">
            <Reply className="w-3.5 h-3.5" />
          </button>
          {isOwn && msg.type === "text" && (
            <button onClick={() => { onEdit(msg); setShowActions(false); }} className="p-1 rounded text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {reactions.length > 0 && (
        <div className={`flex flex-wrap gap-1 mt-0.5 px-1 ${isOwn ? "justify-end" : "justify-start"}`}>
          {reactions.map((r) => {
            const iReacted = currentUserId ? r.userIds.includes(currentUserId) : false;
            return (
              <button
                key={r.emoji}
                onClick={() => onReact(msg.id, r.emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  iReacted
                    ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300"
                    : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
              >
                <span className="text-sm leading-none">{r.emoji}</span>
                <span>{r.userIds.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {isLastInGroup ? (
        <div className="flex items-center gap-1.5 px-1 mt-0.5">
          <span className="text-[10px] text-gray-400 dark:text-slate-500">
            {new Date(msg.createdAt + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {msg.editedAt && <span className="text-[10px] text-gray-400 dark:text-slate-500 italic">edited</span>}
          {isOwn && (
            <CheckCheck className={`w-3.5 h-3.5 ${isRead ? "text-blue-500" : "text-gray-300 dark:text-slate-600"}`} />
          )}
          {msg.isPersistent ? (
            <Pin className="w-2.5 h-2.5 text-indigo-400 dark:text-indigo-500" />
          ) : (
            <span className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{ttl}
            </span>
          )}
        </div>
      ) : isOwn && (
        <div className="flex justify-end px-1 mt-0.5">
          <CheckCheck className={`w-3 h-3 ${isRead ? "text-blue-500" : "text-gray-300 dark:text-slate-600"}`} />
        </div>
      )}
    </div>
  );
}

function EmojiPickerButton({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="p-1 rounded text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="React">
        <SmilePlus className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg p-1.5 flex gap-0.5 z-50 whitespace-nowrap">
          {QUICK_EMOJIS.map((em) => (
            <button key={em} onClick={() => { onSelect(em); setOpen(false); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-lg leading-none">
              {em}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typing dots
// ---------------------------------------------------------------------------

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: `${i * 150}ms`, animationDuration: "0.8s" }} />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main ChatRoomView component
// ---------------------------------------------------------------------------

export interface ChatRoomViewProps {
  token: string;
  showBackButton?: boolean;
  heightClass?: string;
}

export function ChatRoomView({ token, showBackButton = false, heightClass = "h-dvh" }: ChatRoomViewProps) {
  const router = useRouter();
  const [room, setRoom] = useState<ChatRoomData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const [previewTicker, setPreviewTicker] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [tickerSuggestions, setTickerSuggestions] = useState<{ symbol: string; shortname: string; exchange: string }[]>([]);
  const [tickerHighlight, setTickerHighlight] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [reactions, setReactions] = useState<Record<string, ChatReaction[]>>({});
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingAudio, setPendingAudio] = useState<{ previewUrl: string; durationSec: number; mime: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordElapsedSec, setRecordElapsedSec] = useState(0);
  const pendingAudioBlobRef = useRef<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Wall-clock start for the current take — used when <audio> metadata is wrong for WebM/Opus (common on Safari). */
  const recordingStartedAtRef = useRef<number | null>(null);
  const [membership, setMembership] = useState<"active" | "pending" | null>(null);
  const [inviterPreview, setInviterPreview] = useState<{ userId: string; displayName: string; avatarUrl: string } | null>(null);
  const [inviteActionLoading, setInviteActionLoading] = useState(false);
  const tickerAbortRef = useRef<AbortController | null>(null);
  const tickerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingSentRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const typingNames = useMemo(() => {
    const now = Date.now();
    return participants
      .filter((p) => p.userId !== currentUserId && p.lastTypingAt && now - new Date(p.lastTypingAt + "Z").getTime() < TYPING_VISIBLE_MS)
      .map((p) => p.displayName);
  }, [participants, currentUserId]);

  useEffect(() => {
    if (!showAttachMenu) return;
    function handleTap(e: MouseEvent | TouchEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setShowAttachMenu(false);
    }
    document.addEventListener("mousedown", handleTap);
    document.addEventListener("touchstart", handleTap);
    return () => { document.removeEventListener("mousedown", handleTap); document.removeEventListener("touchstart", handleTap); };
  }, [showAttachMenu]);

  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, []);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.user?.id) setCurrentUserId(data.user.id); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setParticipants([]);
    setRoom(null);
    setError(null);
    setReplyTo(null);
    setEditingMsg(null);
    setInput("");
    lastMessageIdRef.current = null;
    setMembership(null);
    setInviterPreview(null);

    fetch(`/api/chat/${token}`)
      .then(async (r) => {
        if (r.status === 403) {
          const errBody = await r.json().catch(() => ({}));
          throw new Error(typeof errBody.error === "string" ? errBody.error : "You do not have access to this chat");
        }
        if (!r.ok) throw new Error(r.status === 404 ? "Chat not found" : "Failed to load chat");
        return r.json() as Promise<{
          room: ChatRoomData;
          messages: ChatMessage[];
          participants: Participant[];
          reactions?: Record<string, ChatReaction[]>;
          membership?: "active" | "pending";
          inviter?: { userId: string; displayName: string; avatarUrl: string } | null;
        }>;
      })
      .then((data) => {
        setRoom(data.room);
        setMessages(data.messages || []);
        setParticipants(data.participants || []);
        if (data.reactions) setReactions(data.reactions);
        const m = data.membership ?? "active";
        setMembership(m);
        setInviterPreview(data.inviter ?? null);
        if (m === "active" && data.messages.length > 0) {
          const lastId = data.messages[data.messages.length - 1].id;
          lastMessageIdRef.current = lastId;
          fetch(`/api/chat/${token}?lastRead=${lastId}`).catch(() => {});
        }
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load chat"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!room || membership !== "active") return;
    const interval = setInterval(() => {
      const params = new URLSearchParams();
      if (lastMessageIdRef.current) params.set("after", lastMessageIdRef.current);
      if (lastMessageIdRef.current) params.set("lastRead", lastMessageIdRef.current);
      const qs = params.toString();
      fetch(`/api/chat/${token}${qs ? `?${qs}` : ""}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { room: ChatRoomData; messages: ChatMessage[]; participants: Participant[]; reactions?: Record<string, ChatReaction[]>; membership?: string } | null) => {
          if (!data) return;
          if (data.membership === "pending") return;
          if (data.participants) setParticipants(data.participants);
          if (data.reactions) setReactions(data.reactions);
          if (data.messages.length === 0) return;
          setMessages((prev) => {
            const byId = new Map(prev.map((m) => [m.id, m]));
            let changed = false;
            for (const m of data.messages) {
              const existing = byId.get(m.id);
              if (!existing) { byId.set(m.id, m); changed = true; }
              else if (m.editedAt && m.editedAt !== existing.editedAt) { byId.set(m.id, m); changed = true; }
            }
            if (!changed) return prev;
            return Array.from(byId.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });
          const newest = data.messages[data.messages.length - 1];
          if (!newest.editedAt) lastMessageIdRef.current = newest.id;
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [room, token, membership]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    const timer = setInterval(() => { setMessages((prev) => prev.filter((m) => m.isPersistent || new Date(m.expiresAt + "Z").getTime() > Date.now())); }, 60_000);
    return () => clearInterval(timer);
  }, []);

  function sendTypingHeartbeat() {
    if (membership !== "active") return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_HEARTBEAT_MS) return;
    lastTypingSentRef.current = now;
    fetch(`/api/chat/${token}/typing`, { method: "POST" }).catch(() => {});
  }

  async function sendMessage(type: "text" | "link" | "image" | "audio", content: string) {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      if (editingMsg) {
        const res = await fetch(`/api/chat/${token}/messages`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: editingMsg.id, content }) });
        if (!res.ok) { const data = await res.json().catch(() => ({ error: "Failed to edit" })); throw new Error(data.error || "Failed to edit"); }
        const updated: ChatMessage = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setEditingMsg(null); setInput(""); resetTextareaHeight();
      } else {
        const body: Record<string, string> = { type, content };
        if (replyTo) body.replyToId = replyTo.id;
        const res = await fetch(`/api/chat/${token}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) { const data = await res.json().catch(() => ({ error: "Failed to send" })); throw new Error(data.error || "Failed to send"); }
        const msg: ChatMessage = await res.json();
        setMessages((prev) => { if (prev.some((m) => m.id === msg.id)) return prev; return [...prev, msg]; });
        lastMessageIdRef.current = msg.id; setReplyTo(null); setInput(""); resetTextareaHeight();
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to send message"); }
    finally { setSending(false); }
  }

  async function sendCardMessage(type: ChatMessageType, content: string, persistent: boolean) {
    setSending(true);
    try {
      const body: Record<string, unknown> = { type, content, persistent };
      const res = await fetch(`/api/chat/${token}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const data = await res.json().catch(() => ({ error: "Failed to send" })); throw new Error(data.error || "Failed to send"); }
      const msg: ChatMessage = await res.json();
      setMessages((prev) => { if (prev.some((m) => m.id === msg.id)) return prev; return [...prev, msg]; });
      lastMessageIdRef.current = msg.id;
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to send"); }
    finally { setSending(false); }
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    clearTickerSuggestions();
    sendMessage(isUrl(text) ? "link" : "text", text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (tickerSuggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setTickerHighlight((h) => (h + 1) % tickerSuggestions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setTickerHighlight((h) => (h - 1 + tickerSuggestions.length) % tickerSuggestions.length); return; }
      if (e.key === "Tab" || (e.key === "Enter" && !e.altKey)) {
        e.preventDefault();
        applyTickerSuggestion(tickerSuggestions[tickerHighlight].symbol);
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); clearTickerSuggestions(); return; }
    }
    if (e.key === "Enter" && e.altKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    if (e.key === "ArrowUp" && (e.metaKey || e.ctrlKey) && !editingMsg && !input.trim()) {
      e.preventDefault();
      const lastOwn = [...messages].reverse().find((m) => m.senderId === currentUserId && m.type === "text");
      if (lastOwn) startEdit(lastOwn);
    }
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  function resetTextareaHeight() {
    if (inputRef.current) inputRef.current.style.height = "auto";
  }

  function getTickerQuery(text: string, cursorPos: number): string | null {
    const before = text.slice(0, cursorPos);
    const match = before.match(/\$([A-Za-z]{1,5}(?:\.[A-Za-z]{0,3})?)$/);
    return match ? match[1] : null;
  }

  function fetchTickerSuggestions(query: string) {
    if (tickerDebounceRef.current) clearTimeout(tickerDebounceRef.current);
    if (tickerAbortRef.current) tickerAbortRef.current.abort();
    tickerDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      tickerAbortRef.current = controller;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) return;
        const results: { symbol: string; shortname: string; exchange: string }[] = await res.json();
        if (!controller.signal.aborted) {
          setTickerSuggestions(results.slice(0, 6));
          setTickerHighlight(0);
        }
      } catch { /* aborted or network error */ }
    }, 200);
  }

  function clearTickerSuggestions() {
    setTickerSuggestions([]);
    setTickerHighlight(0);
    if (tickerDebounceRef.current) clearTimeout(tickerDebounceRef.current);
    if (tickerAbortRef.current) tickerAbortRef.current.abort();
  }

  function applyTickerSuggestion(symbol: string) {
    const el = inputRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? input.length;
    const before = input.slice(0, pos);
    const after = input.slice(pos);
    const dollarIdx = before.lastIndexOf("$");
    if (dollarIdx < 0) return;
    const newText = before.slice(0, dollarIdx) + "$" + symbol + " " + after;
    setInput(newText);
    clearTickerSuggestions();
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const newPos = dollarIdx + symbol.length + 2;
        inputRef.current.selectionStart = newPos;
        inputRef.current.selectionEnd = newPos;
        inputRef.current.focus();
        autoResize(inputRef.current);
      }
    });
  }

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmClear(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleClearChat() {
    setClearing(true);
    try {
      const res = await fetch(`/api/chat/${token}/clear`, { method: "DELETE" });
      if (res.ok) {
        setMessages([]);
        lastMessageIdRef.current = null;
      }
    } catch { /* ignore */ }
    finally {
      setClearing(false);
      setConfirmClear(false);
      setMenuOpen(false);
    }
  }

  function scrollToMessage(messageId: string) {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight-flash");
    setTimeout(() => el.classList.remove("highlight-flash"), 1500);
  }

  async function handleReact(messageId: string, emoji: string) {
    // Optimistic update
    setReactions((prev) => {
      const msgReactions = [...(prev[messageId] || [])];
      const idx = msgReactions.findIndex((r) => r.emoji === emoji);
      if (idx >= 0) {
        const r = msgReactions[idx];
        if (currentUserId && r.userIds.includes(currentUserId)) {
          const filtered = r.userIds.filter((id) => id !== currentUserId);
          if (filtered.length === 0) msgReactions.splice(idx, 1);
          else msgReactions[idx] = { ...r, userIds: filtered };
        } else {
          msgReactions[idx] = { ...r, userIds: [...r.userIds, currentUserId || ""] };
        }
      } else {
        msgReactions.push({ emoji, userIds: [currentUserId || ""] });
      }
      return { ...prev, [messageId]: msgReactions };
    });

    try {
      const res = await fetch(`/api/chat/${token}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      if (res.ok) {
        const data: { reactions: Record<string, ChatReaction[]> } = await res.json();
        setReactions(data.reactions);
      }
    } catch { /* ignore */ }
  }

  const MAX_DIMENSION = 1920;
  const JPEG_QUALITY = 0.8;
  const MAX_COMPRESSED_BYTES = 3.5 * 1024 * 1024;

  function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        const sizeEstimate = Math.ceil((dataUrl.length - "data:image/jpeg;base64,".length) * 3 / 4);
        if (sizeEstimate > MAX_COMPRESSED_BYTES) {
          reject(new Error("Image is still too large after compression. Try a smaller image."));
          return;
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  }

  async function processAndSendImage(file: File) {
    if (!file.type.startsWith("image/")) { setError("Only image files are allowed"); return; }
    try {
      const dataUrl = await compressImage(file);
      setPendingImage(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process image");
    }
  }

  async function confirmSendImage() {
    if (!pendingImage) return;
    try {
      setSending(true);
      await sendMessage("image", pendingImage);
      setPendingImage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send image");
      setSending(false);
    }
  }

  function clearRecordTimer() {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }

  async function finalizeRecordedBlob(blob: Blob, mime: string) {
    const startedAt = recordingStartedAtRef.current;
    recordingStartedAtRef.current = null;
    const wallSec =
      startedAt != null ? Math.min(MAX_RECORDING_SEC + 0.5, Math.max(0, (Date.now() - startedAt) / 1000)) : 0;

    if (blob.size < 64) {
      setError("Recording too short.");
      return;
    }
    const previewUrl = URL.createObjectURL(blob);
    try {
      let duration = await getBlobDurationSeconds(previewUrl);
      if (!Number.isFinite(duration) || duration <= 0 || duration === Infinity) {
        duration = wallSec;
      }
      if (duration <= 0 && wallSec > 0) {
        duration = wallSec;
      }
      if (duration <= 0) {
        URL.revokeObjectURL(previewUrl);
        setError("Could not read recording.");
        return;
      }
      if (duration > MAX_RECORDING_SEC + 0.75) {
        URL.revokeObjectURL(previewUrl);
        setError("Recording is too long (max 1 minute).");
        return;
      }
      const durationSec = Math.min(Math.max(Math.ceil(duration), 1), MAX_RECORDING_SEC);
      pendingAudioBlobRef.current = blob;
      setPendingAudio({ previewUrl, durationSec, mime: mime.split(";")[0] || "audio/webm" });
    } catch {
      URL.revokeObjectURL(previewUrl);
      setError("Could not read recording.");
    }
  }

  async function startRecording() {
    if (pendingImage || pendingAudio || isRecording || membership !== "active") return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice recording is not supported in this browser.");
      return;
    }
    const mime = pickRecordingMimeType();
    if (!mime) {
      setError("Voice recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      recordChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        recordStreamRef.current = null;
        const baseMime = mime.split(";")[0] || "audio/webm";
        const blob = new Blob(recordChunksRef.current, { type: baseMime });
        recordChunksRef.current = [];
        void finalizeRecordedBlob(blob, mime);
      };
      recordingStartedAtRef.current = Date.now();
      mr.start(250);
      setIsRecording(true);
      setRecordElapsedSec(0);
      clearRecordTimer();
      recordTimerRef.current = setInterval(() => {
        setRecordElapsedSec((s) => {
          const n = s + 1;
          if (n >= MAX_RECORDING_SEC) {
            queueMicrotask(() => void stopRecording());
          }
          return n;
        });
      }, 1000);
    } catch {
      setError("Microphone access denied or unavailable.");
    }
  }

  async function stopRecording() {
    clearRecordTimer();
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") {
      setIsRecording(false);
      setRecordElapsedSec(0);
      return;
    }
    mr.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordElapsedSec(0);
  }

  async function toggleRecording() {
    if (isRecording) await stopRecording();
    else await startRecording();
  }

  function cancelPendingAudio() {
    if (pendingAudio) URL.revokeObjectURL(pendingAudio.previewUrl);
    setPendingAudio(null);
    pendingAudioBlobRef.current = null;
  }

  async function confirmSendAudio() {
    const blob = pendingAudioBlobRef.current;
    const meta = pendingAudio;
    if (!blob || !meta) return;
    setSending(true);
    setError(null);
    try {
      const fd = new FormData();
      const ext = meta.mime.includes("webm")
        ? "webm"
        : meta.mime.includes("mp4") || meta.mime.includes("m4a")
          ? "m4a"
          : "audio";
      fd.append("file", new File([blob], `voice.${ext}`, { type: meta.mime }));
      const up = await fetch(`/api/chat/${token}/audio`, { method: "POST", body: fd });
      if (!up.ok) {
        const data = await up.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
      }
      const uploaded: { url: string; contentType?: string } = await up.json();
      const content = JSON.stringify({
        url: uploaded.url,
        durationSec: meta.durationSec,
        mime: uploaded.contentType || meta.mime,
      });
      await sendMessage("audio", content);
      URL.revokeObjectURL(meta.previewUrl);
      setPendingAudio(null);
      pendingAudioBlobRef.current = null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send voice message");
      setSending(false);
    }
  }

  async function processAudioFile(file: File) {
    if (!file.type.startsWith("audio/")) {
      setError("Only audio files are allowed");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    try {
      const duration = await getBlobDurationSeconds(previewUrl);
      if (duration <= 0 || duration > MAX_RECORDING_SEC + 0.75) {
        URL.revokeObjectURL(previewUrl);
        setError(duration > MAX_RECORDING_SEC + 0.75 ? "Audio must be 1 minute or less." : "Could not read audio file.");
        return;
      }
      const durationSec = Math.min(Math.max(Math.ceil(duration), 1), MAX_RECORDING_SEC);
      pendingAudioBlobRef.current = file;
      setPendingAudio({ previewUrl, durationSec, mime: file.type || "audio/webm" });
    } catch {
      URL.revokeObjectURL(previewUrl);
      setError("Could not read audio file.");
    }
  }

  function handleAudioFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void processAudioFile(file);
    e.target.value = "";
  }

  useEffect(() => {
    return () => {
      clearRecordTimer();
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") {
        try {
          mr.stop();
        } catch {
          /* ignore */
        }
      }
      recordStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    processAndSendImage(file);
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items; if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile(); if (!file) return;
        processAndSendImage(file);
        return;
      }
    }
  }

  function startReply(msg: ChatMessage) { setEditingMsg(null); setReplyTo(msg); inputRef.current?.focus(); }
  function startEdit(msg: ChatMessage) {
    setReplyTo(null);
    setEditingMsg(msg);
    setInput(msg.content);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        autoResize(inputRef.current);
        inputRef.current.focus();
      }
    });
  }
  function cancelAction() { setReplyTo(null); setEditingMsg(null); setInput(""); resetTextareaHeight(); }

  const groupedMessages = useMemo(() => {
    return messages.map((msg, i) => {
      const prev = i > 0 ? messages[i - 1] : null;
      const next = i < messages.length - 1 ? messages[i + 1] : null;
      return { msg, isFirstInGroup: !prev || prev.senderId !== msg.senderId, isLastInGroup: !next || next.senderId !== msg.senderId };
    });
  }, [messages]);

  const readMsgIds = useMemo(() => {
    const otherReads = participants
      .filter((p) => p.userId !== currentUserId && p.lastReadMsgId)
      .map((p) => p.lastReadMsgId);
    return new Set(otherReads);
  }, [participants, currentUserId]);

  const isMessageRead = useCallback((msgId: string) => {
    if (readMsgIds.size === 0) return false;
    const msgIndex = messages.findIndex((m) => m.id === msgId);
    if (msgIndex < 0) return false;
    for (const readId of readMsgIds) {
      const readIndex = messages.findIndex((m) => m.id === readId);
      if (readIndex >= msgIndex) return true;
    }
    return false;
  }, [readMsgIds, messages]);

  async function acceptInvitation() {
    setInviteActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/${token}/invite/accept`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Could not accept invitation");
      }
      const chatRes = await fetch(`/api/chat/${token}`);
      if (!chatRes.ok) throw new Error("Failed to reload chat");
      const data = await chatRes.json() as {
        room: ChatRoomData;
        messages: ChatMessage[];
        participants: Participant[];
        reactions?: Record<string, ChatReaction[]>;
        membership?: "active" | "pending";
      };
      setRoom(data.room);
      setMessages(data.messages || []);
      setParticipants(data.participants || []);
      if (data.reactions) setReactions(data.reactions);
      setMembership(data.membership ?? "active");
      setInviterPreview(null);
      if (data.messages && data.messages.length > 0) {
        const lastId = data.messages[data.messages.length - 1].id;
        lastMessageIdRef.current = lastId;
        fetch(`/api/chat/${token}?lastRead=${lastId}`).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to accept");
    } finally {
      setInviteActionLoading(false);
    }
  }

  async function declineInvitation() {
    setInviteActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/${token}/invite/decline`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Could not decline invitation");
      }
      router.push("/chats");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to decline");
    } finally {
      setInviteActionLoading(false);
    }
  }

  if (loading) {
    return <div className={`flex items-center justify-center ${heightClass}`}><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  if (error && !room) {
    return (
      <div className={`flex flex-col items-center justify-center ${heightClass} gap-3 px-4`}>
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <p className="text-gray-700 dark:text-slate-300 text-center">{error}</p>
      </div>
    );
  }

  if (room && membership === "pending") {
    const inv =
      inviterPreview ||
      participants.find((p) => p.userId !== currentUserId && p.membershipStatus === "active");
    const name = inv?.displayName || "Someone";
    return (
      <div className={`flex flex-col ${heightClass} overflow-hidden bg-white dark:bg-slate-900`}>
        <header className="shrink-0 border-b border-gray-200 dark:border-slate-800 px-4 py-3">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Link href="/chats" className="p-1 -ml-1 rounded-lg text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </Link>
            )}
            <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">Chat invitation</h1>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-center space-y-2 max-w-sm">
            <p className="text-gray-800 dark:text-slate-200">
              <span className="font-semibold">{name}</span> invited you to a private chat on Trefolio.
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Accept to see messages and reply. If you decline, this conversation stays closed until they send a new invite.
            </p>
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={declineInvitation}
              disabled={inviteActionLoading}
              className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={acceptInvitation}
              disabled={inviteActionLoading}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {inviteActionLoading ? "Working…" : "Accept"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${heightClass} overflow-hidden`} style={{ overscrollBehavior: "none" }}>
      {/* Header */}
      <header className="shrink-0 border-b border-gray-200 dark:border-slate-800 px-4 py-3 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Link href="/chats" className="p-1 -ml-1 rounded-lg text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {room?.label || "Private Chat"}
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {(() => {
                const other = participants.find((p) => p.userId !== currentUserId);
                if (other?.lastSeenAt) return lastSeenText(other.lastSeenAt);
                return "Messages expire 24 hours after being sent";
              })()}
            </p>
          </div>
          {participants.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <Users className="w-4 h-4 text-gray-400 dark:text-slate-500" />
              <div className="flex -space-x-2">
                {participants.map((p) => {
                  const c = USER_COLORS[userColorIndex(p.userId)];
                  const online = isParticipantOnline(p.lastSeenAt);
                  return (
                    <div key={p.userId} title={p.displayName} className="relative">
                      <div className={`w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-semibold overflow-hidden ring-1 ${c.ring} ${c.bg} ${c.text}`}>
                        {p.avatarUrl ? <img src={p.avatarUrl} alt={p.displayName} className="w-full h-full object-cover" /> : p.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${online ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}`} />
                    </div>
                  );
                })}
              </div>
              <span className="text-xs text-gray-500 dark:text-slate-400 hidden sm:inline">
                {participants.map((p) => p.displayName).join(", ")}
              </span>
            </div>
          )}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => { setMenuOpen((v) => !v); setConfirmClear(false); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-4.5 h-4.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                {confirmClear ? (
                  <div className="p-3 space-y-2">
                    <p className="text-xs text-gray-600 dark:text-slate-300">Clear this conversation? Messages will only be removed from your view.</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleClearChat}
                        disabled={clearing}
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {clearing ? "Clearing…" : "Clear"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear conversation
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col overscroll-none">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-slate-500 mt-12">No messages yet. Start the conversation!</p>
        )}
        {groupedMessages.map(({ msg, isFirstInGroup, isLastInGroup }) => (
          <div key={msg.id} id={`msg-${msg.id}`} className={isFirstInGroup ? "mt-3 first:mt-0" : "mt-0.5"}>
            <MessageBubble msg={msg} isOwn={msg.senderId === currentUserId} isRead={isMessageRead(msg.id)} isFirstInGroup={isFirstInGroup} isLastInGroup={isLastInGroup} color={USER_COLORS[userColorIndex(msg.senderId)]} allMessages={messages} reactions={reactions[msg.id] || []} currentUserId={currentUserId} onReply={startReply} onEdit={startEdit} onTickerClick={setPreviewTicker} onReact={handleReact} onScrollToReply={scrollToMessage} />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Typing */}
      {typingNames.length > 0 && (
        <div className="px-4 pb-1">
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {typingNames.length === 1 ? `${typingNames[0]} is typing` : `${typingNames.join(", ")} are typing`}
            <TypingDots />
          </span>
        </div>
      )}

      {/* Error toast */}
      {error && room && (
        <div className="px-4 pb-2">
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm px-3 py-2 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2 font-medium hover:underline">Dismiss</button>
          </div>
        </div>
      )}

      {/* Reply / Edit bar */}
      {(replyTo || editingMsg) && (
        <div className="px-4 pt-2 flex items-center gap-2 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
          <div className="flex-1 min-w-0">
            {replyTo && (
              <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300">
                <Reply className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-medium text-gray-900 dark:text-slate-100">{replyTo.senderName}</span>
                <span className="truncate text-gray-600 dark:text-slate-400">
                  {replyTo.type === "image" ? "Photo" : replyTo.type === "audio" ? "Voice message" : replyTo.content.slice(0, 50)}
                </span>
              </div>
            )}
            {editingMsg && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                <Pencil className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="font-medium text-indigo-600 dark:text-indigo-400">Editing message</span>
              </div>
            )}
          </div>
          <button onClick={cancelAction} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Image preview before send */}
      {pendingImage && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="relative inline-block">
            <img
              src={pendingImage}
              alt="Preview"
              className="max-h-52 max-w-full rounded-xl border border-gray-200 dark:border-slate-700 object-contain"
            />
            <button
              type="button"
              onClick={() => setPendingImage(null)}
              className="absolute -top-2 -right-2 p-1 rounded-full bg-gray-800/70 text-white hover:bg-gray-800 transition-colors"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              type="button"
              onClick={confirmSendImage}
              disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
            <button
              type="button"
              onClick={() => setPendingImage(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isRecording && (
        <div
          className="px-4 py-2.5 flex items-center justify-between gap-3 border-t border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40"
          role="status"
          aria-live="polite"
          aria-label={`Recording voice message, ${recordElapsedSec} seconds of 60 maximum`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping motion-reduce:animate-none rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600 dark:bg-red-400" />
            </span>
            <div className="flex flex-col gap-0.5 min-w-0 sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm font-semibold text-red-900 dark:text-red-100">Recording…</span>
              <span className="text-xs sm:text-sm font-medium text-red-800/90 dark:text-red-200/95 tabular-nums">
                {Math.floor(recordElapsedSec / 60)}:{String(recordElapsedSec % 60).padStart(2, "0")} / 1:00
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void stopRecording()}
            className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            aria-label="Stop recording"
          >
            Stop
          </button>
        </div>
      )}

      {pendingAudio && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="relative inline-flex flex-col gap-2 max-w-full">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-base font-semibold tabular-nums text-gray-900 dark:text-slate-100">
                {formatVoiceDurationMmSs(pendingAudio.durationSec)}
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400">Voice clip · preview before sending</span>
            </div>
            <audio
              src={pendingAudio.previewUrl}
              controls
              preload="metadata"
              className="w-full max-w-xs h-10"
              aria-label={`Voice message preview, ${formatVoiceDurationMmSs(pendingAudio.durationSec)}`}
            />
            <button
              type="button"
              onClick={cancelPendingAudio}
              className="absolute -top-2 -right-2 p-1 rounded-full bg-gray-800/70 text-white hover:bg-gray-800 transition-colors"
              aria-label="Remove voice message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              type="button"
              onClick={() => void confirmSendAudio()}
              disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
            <button
              type="button"
              onClick={cancelPendingAudio}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Ticker autocomplete */}
      {tickerSuggestions.length > 0 && (
        <div className="px-4 pb-1">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
            {tickerSuggestions.map((s, i) => (
              <button
                key={s.symbol}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyTickerSuggestion(s.symbol); }}
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm transition-colors ${
                  i === tickerHighlight
                    ? "bg-indigo-50 dark:bg-indigo-500/15"
                    : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                  {s.symbol.slice(0, 2)}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-900 dark:text-white">${s.symbol}</span>
                  <span className="ml-1.5 text-xs text-gray-500 dark:text-slate-400 truncate">{s.shortname}</span>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 shrink-0">{s.exchange}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-end gap-2" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        {!editingMsg && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            <input ref={audioFileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioFileUpload} />
            {/* Mobile: single + button that opens a popover menu */}
            <div className="relative md:hidden" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => setShowAttachMenu((v) => !v)}
                className={`p-2 mb-0.5 rounded-lg transition-colors ${showAttachMenu ? "text-indigo-600 bg-gray-100 dark:bg-slate-800" : "text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400"}`}
                aria-label="Attach"
                aria-expanded={showAttachMenu}
              >
                <Plus className={`w-5 h-5 transition-transform ${showAttachMenu ? "rotate-45" : ""}`} />
              </button>
              {showAttachMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1 w-48 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setShareModalOpen(true); setShowAttachMenu(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 text-gray-700 dark:text-slate-300 active:bg-gray-100 dark:active:bg-slate-700 transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    Share portfolio
                  </button>
                  <button
                    type="button"
                    onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 text-gray-700 dark:text-slate-300 active:bg-gray-100 dark:active:bg-slate-700 transition-colors"
                  >
                    <ImagePlus className="w-4 h-4 text-emerald-500 shrink-0" />
                    Upload image
                  </button>
                  <button
                    type="button"
                    onClick={() => { cameraInputRef.current?.click(); setShowAttachMenu(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 text-gray-700 dark:text-slate-300 active:bg-gray-100 dark:active:bg-slate-700 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-amber-500 shrink-0" />
                    Take photo
                  </button>
                  <button
                    type="button"
                    onClick={() => { audioFileInputRef.current?.click(); setShowAttachMenu(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 text-gray-700 dark:text-slate-300 active:bg-gray-100 dark:active:bg-slate-700 transition-colors"
                  >
                    <FileAudio className="w-4 h-4 text-violet-500 shrink-0" />
                    Attach audio
                  </button>
                  <button
                    type="button"
                    onClick={() => { void toggleRecording(); setShowAttachMenu(false); }}
                    disabled={!!pendingImage || !!pendingAudio || membership !== "active"}
                    className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 text-gray-700 dark:text-slate-300 active:bg-gray-100 dark:active:bg-slate-700 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Mic className="w-4 h-4 text-rose-500 shrink-0" />
                    {isRecording ? "Stop recording" : "Record voice"}
                  </button>
                </div>
              )}
            </div>
            {/* Desktop: individual action buttons */}
            <button type="button" onClick={() => setShareModalOpen(true)} className="hidden md:block p-2 mb-0.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors" title="Share portfolio data">
              <Share2 className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="hidden md:block p-2 mb-0.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors" title="Upload image">
              <ImagePlus className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => audioFileInputRef.current?.click()}
              disabled={!!pendingImage || !!pendingAudio || isRecording || membership !== "active"}
              className="hidden md:block p-2 mb-0.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              title="Attach audio file"
              aria-label="Attach audio file"
            >
              <FileAudio className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => void toggleRecording()}
              disabled={!!pendingImage || !!pendingAudio || membership !== "active"}
              className={`hidden md:block p-2 mb-0.5 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                isRecording
                  ? "text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300"
                  : "text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400"
              }`}
              title={isRecording ? "Stop recording" : "Record voice message"}
              aria-label={isRecording ? "Stop recording" : "Record voice message"}
              aria-pressed={isRecording}
            >
              <Mic className="w-5 h-5" />
            </button>
          </>
        )}
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => {
            const val = e.target.value;
            setInput(val);
            sendTypingHeartbeat();
            autoResize(e.target);
            const q = getTickerQuery(val, e.target.selectionStart ?? val.length);
            if (q && q.length >= 1) fetchTickerSuggestions(q);
            else clearTickerSuggestions();
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={editingMsg ? "Edit your message… ⌥↵ send" : "Type a message… ⌥↵ send"}
          className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-2xl px-4 py-2.5 text-base md:text-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-snug"
          style={{ maxHeight: "120px" }}
        />
        <button type="submit" disabled={!input.trim() || sending} className="p-2.5 mb-0.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {sending ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
        </button>
      </form>

      <SharePortfolioModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onSend={sendCardMessage}
      />

      {previewTicker && (
        <TickerPreviewPanel
          ticker={previewTicker}
          onClose={() => setPreviewTicker(null)}
        />
      )}
    </div>
  );
}
