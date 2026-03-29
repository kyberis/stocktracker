import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { getPrivateChatRoom, addPrivateChatMessage, editPrivateChatMessage } from "@/lib/db";
import type { PrivateChatMessageType } from "@/lib/db";

const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024;
const VALID_TYPES = new Set<PrivateChatMessageType>(["text", "link", "image"]);

function extractToken(pathname: string): string {
  const segments = pathname.split("/");
  return segments[segments.indexOf("chat") + 1] || "";
}

export const POST = withMetrics(
  "/api/chat/[token]/messages",
  async (req: NextRequest) => {
    const { session, error } = await requireSession(req);
    if (error || !session) return error!;

    const token = extractToken(req.nextUrl.pathname);
    if (!token || token.length < 8) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const room = await getPrivateChatRoom(token);
    if (!room) {
      return NextResponse.json({ error: "Chat not found or has been disabled" }, { status: 404 });
    }

    let body: { type?: string; content?: string; replyToId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const type = (body.type || "text") as PrivateChatMessageType;
    const content = typeof body.content === "string" ? body.content : "";
    const replyToId = typeof body.replyToId === "string" ? body.replyToId : undefined;

    if (!VALID_TYPES.has(type)) {
      return NextResponse.json({ error: "Invalid message type" }, { status: 400 });
    }
    if (!content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    if (type === "image") {
      const sizeEstimate = Math.ceil((content.length * 3) / 4);
      if (sizeEstimate > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Image too large. Maximum size is 3.5 MB." },
          { status: 413 }
        );
      }
    }

    const message = await addPrivateChatMessage(token, session.userId, type, content, replyToId);
    return NextResponse.json(message, { status: 201 });
  }
);

export const PATCH = withMetrics(
  "/api/chat/[token]/messages",
  async (req: NextRequest) => {
    const { session, error } = await requireSession(req);
    if (error || !session) return error!;

    const token = extractToken(req.nextUrl.pathname);
    if (!token || token.length < 8) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const room = await getPrivateChatRoom(token);
    if (!room) {
      return NextResponse.json({ error: "Chat not found or has been disabled" }, { status: 404 });
    }

    let body: { messageId?: string; content?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { messageId, content } = body;
    if (!messageId || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "messageId and content are required" }, { status: 400 });
    }

    const updated = await editPrivateChatMessage(messageId, session.userId, content);
    if (!updated) {
      return NextResponse.json({ error: "Message not found or not editable" }, { status: 404 });
    }

    return NextResponse.json(updated);
  }
);
