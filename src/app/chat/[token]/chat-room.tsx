"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, ImagePlus, Clock, AlertTriangle, Loader2, Link as LinkIcon } from "lucide-react";

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
}

interface ChatRoomData {
  id: string;
  createdBy: string;
  label: string;
  isActive: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 3000;

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

function MessageBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  const ttl = timeUntilExpiry(msg.expiresAt);
  return (
    <div className={`flex flex-col gap-1 max-w-[75%] ${isOwn ? "self-end items-end" : "self-start items-start"}`}>
      {!isOwn && (
        <span className="text-xs text-gray-500 dark:text-slate-400 px-1">
          {msg.senderName}
        </span>
      )}
      <div
        className={`rounded-2xl px-4 py-2.5 text-sm break-words ${
          isOwn
            ? "bg-indigo-600 text-white rounded-br-md"
            : "bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700 rounded-bl-md"
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
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[10px] text-gray-400 dark:text-slate-500">
          {new Date(msg.createdAt + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          {ttl}
        </span>
      </div>
    </div>
  );
}

export function ChatRoom({ token }: { token: string }) {
  const [room, setRoom] = useState<ChatRoomData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
      .then((data: { room: ChatRoomData; messages: ChatMessage[] }) => {
        setRoom(data.room);
        setMessages(data.messages);
        if (data.messages.length > 0) {
          lastMessageIdRef.current = data.messages[data.messages.length - 1].id;
        }
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Polling for new messages
  useEffect(() => {
    if (!room) return;
    const interval = setInterval(() => {
      const afterParam = lastMessageIdRef.current ? `?after=${lastMessageIdRef.current}` : "";
      fetch(`/api/chat/${token}${afterParam}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { room: ChatRoomData; messages: ChatMessage[] } | null) => {
          if (!data || data.messages.length === 0) return;
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = data.messages.filter((m) => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs];
          });
          lastMessageIdRef.current = data.messages[data.messages.length - 1].id;
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [room, token]);

  // Scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Filter expired messages client-side
  useEffect(() => {
    const timer = setInterval(() => {
      setMessages((prev) =>
        prev.filter((m) => new Date(m.expiresAt + "Z").getTime() > Date.now())
      );
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  async function sendMessage(type: "text" | "link" | "image", content: string) {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content }),
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
      setInput("");
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
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      sendMessage("image", result);
    };
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
        if (file.size > 2 * 1024 * 1024) {
          setError("Pasted image must be under 2 MB");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => sendMessage("image", reader.result as string);
        reader.readAsDataURL(file);
        return;
      }
    }
  }

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
        <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
          {room?.label || "Private Chat"}
        </h1>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Messages expire 24 hours after being sent
        </p>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-slate-500 mt-12">
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} isOwn={msg.senderId === currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Error toast */}
      {error && room && (
        <div className="px-4 pb-2">
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm px-3 py-2 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2 font-medium hover:underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-2"
      >
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
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={handlePaste}
          placeholder="Type a message..."
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
