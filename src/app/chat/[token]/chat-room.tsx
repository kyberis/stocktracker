"use client";

import { ChatRoomView } from "@/app/chat/chat-room-view";
import ErrorBoundary from "@/components/ErrorBoundary";

export function ChatRoom({ token }: { token: string }) {
  return (
    <ErrorBoundary>
      <ChatRoomView token={token} showBackButton />
    </ErrorBoundary>
  );
}
