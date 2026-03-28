"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Send, ImagePlus, Clock, AlertTriangle, Loader2,
  Link as LinkIcon, Users, Pencil, Reply, X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: "text" | "link" | "image";
  content: string;
  createdAt: string;
  expiresAt: string;
  replyToId: string;
  editedAt: string;
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
}

// ---------------------------------------------------------------------------
// Color palette for distinguishing senders
// ---------------------------------------------------------------------------

const USER_COLORS = [
  { bg: "bg-teal-100 dark:bg-teal-900/60", text: "text-teal-800 dark:text-teal-200", name: "text-teal-700 dark:text-teal-300", ring: "ring-teal-400" },
  { bg: "bg-rose-100 dark:bg-rose-900/60", text: "text-rose-800 dark:text-rose-200", name: "text-rose-700 dark:text-rose-300", ring: "ring-rose-400" },
  { bg: "bg-amber-100 dark:bg-amber-900/60", text: "text-amber-800 dark:text-amber-200", name: "text-amber-700 dark:text-amber-300", ring: "ring-amber-400" },
  { bg: "bg-violet-100 dark:bg-violet-900/60", text: "text-violet-800 dark:text-violet-200", name: "text-violet-700 dark:text-violet-300", ring: "ring-violet-400" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/60", text: "text-emerald-800 dark:text-emerald-200", name: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-400" },
  { bg: "bg-sky-100 dark:bg-sky-900/60", text: "text-sky-800 dark:text-sky-200", name: "text-sky-700 dark:text-sky-300", ring: "ring-sky-400" },
  { bg: "bg-orange-100 dark:bg-orange-900/60", text: "text-orange-800 dark:text-orange-200", name: "text-orange-700 dark:text-orange-300", ring: "ring-orange-400" },
  { bg: "bg-fuchsia-100 dark:bg-fuchsia-900/60", text: "text-fuchsia-800 dark:text-fuchsia-200", name: "text-fuchsia-700 dark:text-fuchsia-300", ring: "ring-fuchsia-400" },
];

function userColorIndex(userId: string): number {
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

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

interface BubbleProps {
  msg: ChatMessage;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  color: typeof USER_COLORS[number];
  allMessages: ChatMessage[];
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
}

function MessageBubble({ msg, isOwn, isFirstInGroup, isLastInGroup, color, allMessages, onReply, onEdit }: BubbleProps) {
  const ttl = timeUntilExpiry(msg.expiresAt);
  const repliedMsg = msg.replyToId ? allMessages.find((m) => m.id === msg.replyToId) : null;

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

      {/* Replied message preview */}
      {repliedMsg && (
        <div className={`text-[11px] px-3 py-1 mb-0.5 rounded-lg border-l-2 ${
          isOwn
            ? "bg-indigo-500/20 border-indigo-300 text-indigo-100"
            : "bg-gray-100 dark:bg-slate-700/50 border-gray-300 dark:border-slate-500 text-gray-600 dark:text-slate-300"
        }`}>
          <span className="font-medium">{repliedMsg.senderName}</span>
          <span className="ml-1 opacity-80">
            {repliedMsg.type === "image" ? "Photo" : repliedMsg.content.slice(0, 60)}
            {repliedMsg.content.length > 60 ? "…" : ""}
          </span>
        </div>
      )}

      <div className="group relative">
        <div
          className={`px-4 py-2.5 text-sm break-words ${
            isOwn
              ? `bg-indigo-600 text-white ${ownRadius}`
              : `${color.bg} ${color.text} ${otherRadius}`
          }`}
        >
          {msg.type === "image" ? (
            <img
              src={msg.content}
              alt="Shared image"
              className="max-w-full max-h-80 rounded-lg"
              loading="lazy"
            />
          ) : msg.type === "link" || isUrl(msg.content) ? (
            <a
              href={msg.content}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline flex items-center gap-1 ${
                isOwn ? "text-indigo-100 hover:text-white" : "text-indigo-600 dark:text-indigo-400 hover:text-indigo-800"
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5 shrink-0" />
              {msg.content}
            </a>
          ) : (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          )}
        </div>

        {/* Action buttons on hover */}
        <div className={`absolute top-0 ${isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"} hidden group-hover:flex items-center gap-0.5`}>
          <button
            onClick={() => onReply(msg)}
            className="p-1 rounded text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          {isOwn && msg.type === "text" && (
            <button
              onClick={() => onEdit(msg)}
              className="p-1 rounded text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isLastInGroup && (
        <div className="flex items-center gap-1.5 px-1 mt-0.5">
          <span className="text-[10px] text-gray-400 dark:text-slate-500">
            {new Date(msg.createdAt + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {msg.editedAt && (
            <span className="text-[10px] text-gray-400 dark:text-slate-500 italic">edited</span>
          )}
          <span className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {ttl}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator dots animation
// ---------------------------------------------------------------------------

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "0.8s" }}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main ChatRoom component
// ---------------------------------------------------------------------------

export function ChatRoom({ token }: { token: string }) {
  const [room, setRoom] = useState<ChatRoomData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Who is currently typing (excluding self)
  const typingNames = useMemo(() => {
    const now = Date.now();
    return participants
      .filter((p) =>
        p.userId !== currentUserId &&
        p.lastTypingAt &&
        now - new Date(p.lastTypingAt + "Z").getTime() < TYPING_VISIBLE_MS
      )
      .map((p) => p.displayName);
  }, [participants, currentUserId]);

  // Re-evaluate typing every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch current user
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (user?.id) setCurrentUserId(user.id);
      })
      .catch(() => {});
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetch(`/api/chat/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "Chat not found" : "Failed to load chat");
        return r.json();
      })
      .then((data: { room: ChatRoomData; messages: ChatMessage[]; participants: Participant[] }) => {
        setRoom(data.room);
        setMessages(data.messages);
        setParticipants(data.participants || []);
        if (data.messages.length > 0) {
          lastMessageIdRef.current = data.messages[data.messages.length - 1].id;
        }
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Polling
  useEffect(() => {
    if (!room) return;
    const interval = setInterval(() => {
      const afterParam = lastMessageIdRef.current ? `?after=${lastMessageIdRef.current}` : "";
      fetch(`/api/chat/${token}${afterParam}`)
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
              if (!existing) {
                byId.set(m.id, m);
                changed = true;
              } else if (m.editedAt && m.editedAt !== existing.editedAt) {
                byId.set(m.id, m);
                changed = true;
              }
            }
            if (!changed) return prev;
            return Array.from(byId.values()).sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
          const newest = data.messages[data.messages.length - 1];
          if (!newest.editedAt) {
            lastMessageIdRef.current = newest.id;
          }
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [room, token]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Expire client-side
  useEffect(() => {
    const timer = setInterval(() => {
      setMessages((prev) =>
        prev.filter((m) => new Date(m.expiresAt + "Z").getTime() > Date.now())
      );
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Typing heartbeat
  function sendTypingHeartbeat() {
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_HEARTBEAT_MS) return;
    lastTypingSentRef.current = now;
    fetch(`/api/chat/${token}/typing`, { method: "POST" }).catch(() => {});
  }

  // Send message (new or edit)
  async function sendMessage(type: "text" | "link" | "image", content: string) {
    if (!content.trim() || sending) return;
    setSending(true);

    try {
      if (editingMsg) {
        const res = await fetch(`/api/chat/${token}/messages`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: editingMsg.id, content }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Failed to edit" }));
          throw new Error(data.error || "Failed to edit");
        }
        const updated: ChatMessage = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setEditingMsg(null);
        setInput("");
      } else {
        const body: Record<string, string> = { type, content };
        if (replyTo) body.replyToId = replyTo.id;

        const res = await fetch(`/api/chat/${token}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Failed to send" }));
          throw new Error(data.error || "Failed to send");
        }
        const msg: ChatMessage = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        lastMessageIdRef.current = msg.id;
        setReplyTo(null);
        setInput("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const type = isUrl(text) ? "link" : "text";
    sendMessage(type, text);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Only image files are allowed"); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Image must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => sendMessage("image", reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { setError("Pasted image must be under 2 MB"); return; }
        const reader = new FileReader();
        reader.onload = () => sendMessage("image", reader.result as string);
        reader.readAsDataURL(file);
        return;
      }
    }
  }

  function startReply(msg: ChatMessage) {
    setEditingMsg(null);
    setReplyTo(msg);
    inputRef.current?.focus();
  }

  function startEdit(msg: ChatMessage) {
    setReplyTo(null);
    setEditingMsg(msg);
    setInput(msg.content);
    inputRef.current?.focus();
  }

  function cancelAction() {
    setReplyTo(null);
    setEditingMsg(null);
    setInput("");
  }

  // Compute message groups
  const groupedMessages = useMemo(() => {
    return messages.map((msg, i) => {
      const prev = i > 0 ? messages[i - 1] : null;
      const next = i < messages.length - 1 ? messages[i + 1] : null;
      return {
        msg,
        isFirstInGroup: !prev || prev.senderId !== msg.senderId,
        isLastInGroup: !next || next.senderId !== msg.senderId,
      };
    });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 px-4">
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <p className="text-gray-700 dark:text-slate-300 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-200 dark:border-slate-800 px-4 py-3 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {room?.label || "Private Chat"}
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Messages expire 24 hours after being sent
            </p>
          </div>
          {participants.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <Users className="w-4 h-4 text-gray-400 dark:text-slate-500" />
              <div className="flex -space-x-2">
                {participants.map((p) => {
                  const c = USER_COLORS[userColorIndex(p.userId)];
                  return (
                    <div
                      key={p.userId}
                      title={p.displayName}
                      className={`w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-semibold overflow-hidden ring-1 ${c.ring} ${c.bg} ${c.text}`}
                    >
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.displayName} className="w-full h-full object-cover" />
                      ) : (
                        p.displayName.charAt(0).toUpperCase()
                      )}
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
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-slate-500 mt-12">
            No messages yet. Start the conversation!
          </p>
        )}
        {groupedMessages.map(({ msg, isFirstInGroup, isLastInGroup }) => (
          <div
            key={msg.id}
            className={isFirstInGroup ? "mt-3 first:mt-0" : "mt-0.5"}
          >
            <MessageBubble
              msg={msg}
              isOwn={msg.senderId === currentUserId}
              isFirstInGroup={isFirstInGroup}
              isLastInGroup={isLastInGroup}
              color={USER_COLORS[userColorIndex(msg.senderId)]}
              allMessages={messages}
              onReply={startReply}
              onEdit={startEdit}
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div className="px-4 pb-1">
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {typingNames.length === 1
              ? `${typingNames[0]} is typing`
              : `${typingNames.join(", ")} are typing`}
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
                <span className="truncate opacity-70">
                  {replyTo.type === "image" ? "Photo" : replyTo.content.slice(0, 50)}
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
          <button onClick={cancelAction} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-2"
      >
        {!editingMsg && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors"
              title="Upload image"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
          </>
        )}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            sendTypingHeartbeat();
          }}
          onPaste={handlePaste}
          placeholder={editingMsg ? "Edit your message..." : "Type a message..."}
          className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-full px-4 py-2.5 text-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <Loader2 className="w-4.5 h-4.5 animate-spin" />
          ) : (
            <Send className="w-4.5 h-4.5" />
          )}
        </button>
      </form>
    </div>
  );
}
