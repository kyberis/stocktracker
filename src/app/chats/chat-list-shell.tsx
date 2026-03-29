"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ChatListSidebar, type ChatRoomSummary } from "./chat-list-sidebar";
import { ChatRoomView } from "@/app/chat/chat-room-view";

const LIST_POLL_MS = 5000;

export function ChatListShell() {
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

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
    fetchRooms().finally(() => setLoading(false));
    const interval = setInterval(fetchRooms, LIST_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function handleSelect(token: string) {
    if (isMobile) {
      router.push(`/chat/${token}`);
    } else {
      setSelectedToken(token);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Mobile: full-screen list only
  if (isMobile) {
    return (
      <div className="h-dvh">
        <ChatListSidebar rooms={rooms} selectedToken={null} onSelect={handleSelect} />
      </div>
    );
  }

  // Desktop: split layout
  return (
    <div className="flex h-dvh">
      <div className="w-80 shrink-0 border-r border-gray-200 dark:border-slate-800 overflow-hidden">
        <ChatListSidebar rooms={rooms} selectedToken={selectedToken} onSelect={handleSelect} />
      </div>
      <div className="flex-1 min-w-0">
        {selectedToken ? (
          <ChatRoomView key={selectedToken} token={selectedToken} showBackButton={false} heightClass="h-full" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 dark:text-slate-500">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
              </svg>
            </div>
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
