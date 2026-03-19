import { NextRequest, NextResponse } from "next/server";
import { consumeUnsubscribeToken, updateUserSettings } from "@/lib/db";

async function handleUnsubscribe(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const userId = await consumeUnsubscribeToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await updateUserSettings(userId, { emailNotificationsEnabled: false });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  return handleUnsubscribe(req);
}

// RFC 8058 one-click unsubscribe via List-Unsubscribe-Post
export async function POST(req: NextRequest) {
  return handleUnsubscribe(req);
}
