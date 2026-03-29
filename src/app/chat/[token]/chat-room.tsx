"use client";

import { ChatRoomView } from "@/app/chat/chat-room-view";

export function ChatRoom({ token }: { token: string }) {
  return <ChatRoomView token={token} showBackButton />;
}
