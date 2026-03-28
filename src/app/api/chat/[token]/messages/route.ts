import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { getPrivateChatRoom, addPrivateChatMessage } from "@/lib/db";
import type { PrivateChatMessageType } from "@/lib/db";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
const VALID_TYPES = new Set<PrivateChatMessageType>(["text", "link", "image"]);

export const POST = withMetrics(
  "/api/chat/[token]/messages",
  async (req: NextRequest) => {
    const { session, error } = await requireSession(req);
    if (error || !session) return error!;

    const segments = req.nextUrl.pathname.split("/");
    const token = segments[segments.indexOf("chat") + 1] || "";
    if (!token || token.length < 8) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const room = await getPrivateChatRoom(token);
    if (!room) {
      return NextResponse.json({ error: "Chat not found or has been disabled" }, { status: 404 });
    }

    let body: { type?: string; content?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const type = (body.type || "text") as PrivateChatMessageType;
    const content = typeof body.content === "string" ? body.content : "";

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
          { error: "Image too large. Maximum size is 2 MB." },
          { status: 413 }
        );
      }
    }

    const message = await addPrivateChatMessage(token, session.userId, type, content);
    return NextResponse.json(message, { status: 201 });
  }
);
