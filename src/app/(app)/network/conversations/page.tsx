"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { NetworkSidebar, NetworkMobileNav } from "@/components/social/NetworkSidebar";
import { ChatRoomView } from "@/app/chat/chat-room-view";
import ErrorBoundary from "@/components/ErrorBoundary";

const LIST_POLL_MS = 5000;

interface ChatRoomSummary {
  id: string;
  label: string;
  createdAt: string;
  lastMessageContent: string;
  lastMessageType: string;
  lastMessageAt: string;
  lastSenderName: string;
  myMembership?: "active" | "pending";
  participants: { userId: string; displayName: string; avatarUrl: string; lastSeenAt: string }[];
}

interface ProfileData {
  displayName: string;
  profileSlug: string;
  avatarUrl: string;
  connectionCount: number;
  postCount: number;
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

function roomTitle(room: ChatRoomSummary): string {
  if (room.label) return room.label;
  if (room.participants.length > 0) return room.participants.map((p) => p.displayName).join(", ");
  return "Private Chat";
}

function lastMessagePreview(room: ChatRoomSummary): string {
  if (room.myMembership === "pending") return "Invitation pending — open to accept";
  if (!room.lastMessageContent) return "No messages yet";
  if (room.lastMessageType === "image") return "Shared a photo";
  if (room.lastMessageType === "audio") return "Voice message";
  if (room.lastMessageType === "link") return room.lastMessageContent;
  if (["holding", "allocation", "summary", "stock_pick"].includes(room.lastMessageType)) {
    return `Shared ${room.lastMessageType.replace("_", " ")}`;
  }
  return room.lastMessageContent;
}

function RoomList({
  rooms,
  selectedToken,
  onSelect,
}: {
  rooms: ChatRoomSummary[];
  selectedToken: string | null;
  onSelect: (token: string) => void;
}) {
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 gap-2">
        <MessageSquare className="w-8 h-8 text-[var(--muted)]" />
        <p className="text-sm text-[var(--muted)]">No conversations yet</p>
        <Link href="/network/connections" className="mt-2 text-xs text-[var(--accent)] hover:underline">
          Connect with people to start chatting
        </Link>
      </div>
    );
  }

  return (
    <>
      {rooms.map((room) => {
        const isActive = room.id === selectedToken;
        const title = roomTitle(room);
        const preview = lastMessagePreview(room);
        const time = relativeTime(room.lastMessageAt || room.createdAt);
        const initial = (room.participants[0]?.displayName || "?").charAt(0).toUpperCase();

        return (
          <button
            key={room.id}
            onClick={() => onSelect(room.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              isActive ? "bg-[var(--accent)]/10" : "hover:bg-[var(--card-hover)]"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-xs font-bold text-white">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-medium truncate ${isActive ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
                  {title}
                </span>
                {time && (
                  <span className="text-[11px] text-[var(--muted)] shrink-0">{time}</span>
                )}
              </div>
              <p className="text-xs text-[var(--muted)] truncate mt-0.5">{preview}</p>
            </div>
          </button>
        );
      })}
    </>
  );
}

export default function NetworkConversationsPage() {
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const searchParams = useSearchParams();
  const [selectedToken, setSelectedToken] = useState<string | null>(searchParams.get("chat"));

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/chats", { cache: "no-store" });
      if (res.ok) {
        const data: ChatRoomSummary[] = await res.json();
        setRooms(data);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchRooms(),
      fetch("/api/social/profile").then(r => r.ok ? r.json() : null),
      fetch("/api/social/connections?filter=pending_received").then(r => r.ok ? r.json() : { counts: {} }),
    ]).then(([, profileData, connData]) => {
      setProfile(profileData);
      setPendingCount(connData.counts?.pendingReceived || 0);
    }).finally(() => setLoading(false));

    const interval = setInterval(fetchRooms, LIST_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  const selectedRoom = selectedToken ? rooms.find((r) => r.id === selectedToken) : undefined;
  const selectedRoomTitle = selectedRoom ? roomTitle(selectedRoom) : "";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-6">
      <NetworkMobileNav profile={profile} pendingCount={pendingCount} />
      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <div className="hidden w-[260px] shrink-0 lg:block">
          <NetworkSidebar profile={profile} pendingCount={pendingCount} />
        </div>

        {/* Chat area */}
        <div className="min-w-0 flex-1">
          {/* ── Mobile layout: list OR chat, not both ── */}
          <div className="md:hidden">
            {selectedToken ? (
              /* Break out of page px-4 so chat uses full viewport width on mobile (same pattern as NetworkMobileNav). */
              <div className="-mx-4 sm:-mx-6">
                <div
                  className="card overflow-hidden p-0 max-md:rounded-none max-md:border-x-0"
                  style={{ height: "calc(100dvh - 11rem)" }}
                >
                  <div className="flex h-full flex-col">
                    <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
                      <button
                        onClick={() => setSelectedToken(null)}
                        className="p-1 -ml-1 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                      >
                        <ArrowLeft size={18} />
                      </button>
                      <h3 className="text-sm font-semibold text-[var(--foreground)] truncate">{selectedRoomTitle}</h3>
                    </div>
                    <div className="flex-1 min-h-0">
                      <ErrorBoundary>
                        <ChatRoomView key={selectedToken} token={selectedToken} showBackButton={false} heightClass="h-full" />
                      </ErrorBoundary>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Conversations</h3>
                </div>
                <RoomList rooms={rooms} selectedToken={selectedToken} onSelect={setSelectedToken} />
              </div>
            )}
          </div>

          {/* ── Desktop layout: side-by-side ── */}
          <div className="hidden md:block">
            <div className="card overflow-hidden" style={{ height: "calc(100dvh - 10rem)" }}>
              <div className="flex h-full">
                {/* Room list */}
                <div className="w-72 shrink-0 border-r border-[var(--border)] overflow-y-auto">
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Conversations</h3>
                  </div>
                  <RoomList rooms={rooms} selectedToken={selectedToken} onSelect={setSelectedToken} />
                </div>

                {/* Chat view */}
                <div className="flex-1 min-w-0">
                  {selectedToken ? (
                    <ErrorBoundary>
                      <ChatRoomView key={selectedToken} token={selectedToken} showBackButton={false} heightClass="h-full" />
                    </ErrorBoundary>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--muted)]">
                      <MessageSquare className="w-12 h-12" />
                      <p className="text-sm">Select a conversation to start chatting</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
