"use client";

import { useState } from "react";
import { Search, MessageSquare, Image, Link as LinkIcon } from "lucide-react";
import { USER_COLORS, userColorIndex, isParticipantOnline } from "@/app/chat/chat-room-view";

export interface ChatRoomSummary {
  id: string;
  label: string;
  createdAt: string;
  lastMessageContent: string;
  lastMessageType: "text" | "link" | "image";
  lastMessageAt: string;
  lastSenderName: string;
  participants: { userId: string; displayName: string; avatarUrl: string; lastSeenAt: string }[];
}

interface ChatListSidebarProps {
  rooms: ChatRoomSummary[];
  selectedToken: string | null;
  onSelect: (token: string) => void;
}

function relativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  if (diff < 0) return "now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function lastMessagePreview(room: ChatRoomSummary): string {
  if (!room.lastMessageContent) return "No messages yet";
  if (room.lastMessageType === "image") return "Shared a photo";
  if (room.lastMessageType === "link") return room.lastMessageContent;
  return room.lastMessageContent;
}

function roomTitle(room: ChatRoomSummary): string {
  if (room.label) return room.label;
  if (room.participants.length > 0) return room.participants.map((p) => p.displayName).join(", ");
  return "Private Chat";
}

export function ChatListSidebar({ rooms, selectedToken, onSelect }: ChatListSidebarProps) {
  const [filter, setFilter] = useState("");

  const filtered = filter.trim()
    ? rooms.filter((r) => {
        const q = filter.toLowerCase();
        return (
          r.label.toLowerCase().includes(q) ||
          r.participants.some((p) => p.displayName.toLowerCase().includes(q))
        );
      })
    : rooms;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Chats</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 gap-2">
            <MessageSquare className="w-8 h-8 text-gray-300 dark:text-slate-600" />
            <p className="text-sm text-gray-400 dark:text-slate-500">
              {filter.trim() ? "No matching conversations" : "No conversations yet"}
            </p>
          </div>
        )}

        {filtered.map((room) => {
          const isActive = room.id === selectedToken;
          const title = roomTitle(room);
          const preview = lastMessagePreview(room);
          const time = relativeTime(room.lastMessageAt || room.createdAt);
          const visibleParticipants = room.participants.slice(0, 3);

          return (
            <button
              key={room.id}
              onClick={() => onSelect(room.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left transition-colors ${
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-950/40 border-r-2 border-indigo-500"
                  : "hover:bg-gray-50 dark:hover:bg-slate-800/60"
              }`}
            >
              {/* Avatar stack */}
              <div className="relative shrink-0" style={{ width: `${Math.min(visibleParticipants.length, 3) * 8 + 32}px`, height: "40px" }}>
                {visibleParticipants.map((p, i) => {
                  const c = USER_COLORS[userColorIndex(p.userId)];
                  const online = isParticipantOnline(p.lastSeenAt);
                  return (
                    <div
                      key={p.userId}
                      className="absolute top-0"
                      style={{ left: `${i * 8}px`, zIndex: visibleParticipants.length - i }}
                    >
                      <div className={`w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-semibold overflow-hidden ring-1 ${c.ring} ${c.bg} ${c.text}`}>
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.displayName} className="w-full h-full object-cover" />
                        ) : (
                          p.displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${online ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}`} />
                    </div>
                  );
                })}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium truncate ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-white"}`}>
                    {title}
                  </span>
                  {time && (
                    <span className="text-[11px] text-gray-400 dark:text-slate-500 shrink-0">{time}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {room.lastSenderName && (
                    <span className="text-xs text-gray-500 dark:text-slate-400 font-medium shrink-0">
                      {room.lastSenderName}:
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-slate-500 truncate flex items-center gap-1">
                    {room.lastMessageType === "image" && <Image className="w-3 h-3 shrink-0" />}
                    {room.lastMessageType === "link" && <LinkIcon className="w-3 h-3 shrink-0" />}
                    {preview}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
