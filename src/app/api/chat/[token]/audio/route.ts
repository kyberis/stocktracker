import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { getPrivateChatRoom, getParticipantMembership } from "@/lib/db";
import { extForAudioMime } from "@/lib/private-chat-audio";
import { generateId } from "@/lib/utils";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
  "audio/x-wav",
]);

function extractToken(pathname: string): string {
  const segments = pathname.split("/");
  return segments[segments.indexOf("chat") + 1] || "";
}

export const POST = withMetrics("/api/chat/[token]/audio", async (req: NextRequest) => {
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

  const membership = await getParticipantMembership(token, session.userId);
  if (membership !== "active") {
    return NextResponse.json({ error: "You do not have access to post in this chat" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio too large (max 8 MB)" }, { status: 413 });
  }
  if (!ALLOWED_AUDIO_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported audio format" }, { status: 400 });
  }

  const ext = extForAudioMime(file.type);
  const path = `private-chat/${token}/${Date.now()}-${generateId()}.${ext}`;

  try {
    const { put } = await import("@vercel/blob");
    const blob = await put(path, file, { access: "public" });
    return NextResponse.json({ url: blob.url, contentType: file.type });
  } catch {
    return NextResponse.json({ error: "Audio upload not configured" }, { status: 500 });
  }
});
