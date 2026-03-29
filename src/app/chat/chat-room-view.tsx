"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Send, ImagePlus, Camera, Clock, AlertTriangle, Loader2,
  Link as LinkIcon, Users, Pencil, Reply, X, ChevronLeft, CheckCheck,
  Pin, Share2,
} from "lucide-react";
import dynamic from "next/dynamic";

const SharePortfolioModal = dynamic(() => import("./share-portfolio-modal"), { ssr: false });
const TickerPreviewPanel = dynamic(() => import("./ticker-preview-panel"), { ssr: false });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatMessageType = "text" | "link" | "image" | "holding" | "allocation" | "summary" | "stock_pick";

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

interface ChatRoomData {
  id: string;
  createdBy: string;
  label: string;
  isActive: boolean;
  createdAt: string;
}

interface Participant {
  userId: string;
  displayName: string;
  avatarUrl: string;
  joinedAt: string;
  lastTypingAt: string;
  lastSeenAt: string;
  lastReadMsgId: string;
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

interface BubbleProps {
  msg: ChatMessage;
  isOwn: boolean;
  isRead: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  color: typeof USER_COLORS[number];
  allMessages: ChatMessage[];
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onTickerClick: (symbol: string) => void;
}

function MessageBubble({ msg, isOwn, isRead, isFirstInGroup, isLastInGroup, color, allMessages, onReply, onEdit, onTickerClick }: BubbleProps) {
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
        <div className={`text-[11px] px-3 py-1 mb-0.5 rounded-lg border-l-2 ${
          isOwn
            ? "bg-indigo-500/20 border-indigo-300 text-indigo-100"
            : "bg-gray-100 dark:bg-slate-700/50 border-gray-300 dark:border-slate-500 text-gray-600 dark:text-slate-300"
        }`}>
          <span className="font-medium">{repliedMsg.senderName}</span>
          <span className="ml-1 opacity-80">
            {repliedMsg.type === "image" ? "Photo"
              : CARD_TYPES.has(repliedMsg.type) ? `Shared ${repliedMsg.type.replace("_", " ")}`
              : repliedMsg.content.slice(0, 60) + (repliedMsg.content.length > 60 ? "…" : "")}
          </span>
        </div>
      )}

      <div className="group relative">
        {isCardMsg ? (
          <PortfolioCardRenderer type={msg.type} content={msg.content} />
        ) : (
          <div
            className={`px-4 py-2.5 text-sm break-words ${
              isOwn
                ? `bg-indigo-600 text-white ${ownRadius}`
                : `${color.bg} ${color.text} ${otherRadius}`
            }`}
          >
            {msg.type === "image" ? (
              <img src={msg.content} alt="Shared image" className="max-w-full max-h-80 rounded-lg" loading="lazy" />
            ) : msg.type === "link" || isUrl(msg.content) ? (
              <a
                href={msg.content} target="_blank" rel="noopener noreferrer"
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

        <div className={`absolute top-0 ${isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"} hidden group-hover:flex items-center gap-0.5`}>
          <button onClick={() => onReply(msg)} className="p-1 rounded text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="Reply">
            <Reply className="w-3.5 h-3.5" />
          </button>
          {isOwn && msg.type === "text" && (
            <button onClick={() => onEdit(msg)} className="p-1 rounded text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

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
  const [previewTicker, setPreviewTicker] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [tickerSuggestions, setTickerSuggestions] = useState<{ symbol: string; shortname: string; exchange: string }[]>([]);
  const [tickerHighlight, setTickerHighlight] = useState(0);
  const tickerAbortRef = useRef<AbortController | null>(null);
  const tickerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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

    fetch(`/api/chat/${token}`)
      .then((r) => { if (!r.ok) throw new Error(r.status === 404 ? "Chat not found" : "Failed to load chat"); return r.json(); })
      .then((data: { room: ChatRoomData; messages: ChatMessage[]; participants: Participant[] }) => {
        setRoom(data.room);
        setMessages(data.messages);
        setParticipants(data.participants || []);
        if (data.messages.length > 0) {
          const lastId = data.messages[data.messages.length - 1].id;
          lastMessageIdRef.current = lastId;
          fetch(`/api/chat/${token}?lastRead=${lastId}`).catch(() => {});
        }
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!room) return;
    const interval = setInterval(() => {
      const params = new URLSearchParams();
      if (lastMessageIdRef.current) params.set("after", lastMessageIdRef.current);
      if (lastMessageIdRef.current) params.set("lastRead", lastMessageIdRef.current);
      const qs = params.toString();
      fetch(`/api/chat/${token}${qs ? `?${qs}` : ""}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { room: ChatRoomData; messages: ChatMessage[]; participants: Participant[] } | null) => {
          if (!data) return;
          if (data.participants) setParticipants(data.participants);
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
  }, [room, token]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    const timer = setInterval(() => { setMessages((prev) => prev.filter((m) => m.isPersistent || new Date(m.expiresAt + "Z").getTime() > Date.now())); }, 60_000);
    return () => clearInterval(timer);
  }, []);

  function sendTypingHeartbeat() {
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_HEARTBEAT_MS) return;
    lastTypingSentRef.current = now;
    fetch(`/api/chat/${token}/typing`, { method: "POST" }).catch(() => {});
  }

  async function sendMessage(type: "text" | "link" | "image", content: string) {
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
      setSending(true);
      const dataUrl = await compressImage(file);
      await sendMessage("image", dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process image");
      setSending(false);
    }
  }

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
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col overscroll-none">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-slate-500 mt-12">No messages yet. Start the conversation!</p>
        )}
        {groupedMessages.map(({ msg, isFirstInGroup, isLastInGroup }) => (
          <div key={msg.id} className={isFirstInGroup ? "mt-3 first:mt-0" : "mt-0.5"}>
            <MessageBubble msg={msg} isOwn={msg.senderId === currentUserId} isRead={isMessageRead(msg.id)} isFirstInGroup={isFirstInGroup} isLastInGroup={isLastInGroup} color={USER_COLORS[userColorIndex(msg.senderId)]} allMessages={messages} onReply={startReply} onEdit={startEdit} onTickerClick={setPreviewTicker} />
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
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                <Reply className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="font-medium text-gray-700 dark:text-slate-300">{replyTo.senderName}</span>
                <span className="truncate opacity-70">{replyTo.type === "image" ? "Photo" : replyTo.content.slice(0, 50)}</span>
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
            <button type="button" onClick={() => setShareModalOpen(true)} className="p-2 mb-0.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors" title="Share portfolio data">
              <Share2 className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 mb-0.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors" title="Upload image">
              <ImagePlus className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-2 mb-0.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors md:hidden" title="Take photo">
              <Camera className="w-5 h-5" />
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
          className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-2xl px-4 py-2.5 text-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-snug"
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
