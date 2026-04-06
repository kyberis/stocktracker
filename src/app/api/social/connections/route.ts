import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listConnections, countConnections, requestConnection, getPublicProfileBySlug, trackEvent } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/social/connections", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const { searchParams } = new URL(request.url);
  const filter = (searchParams.get("filter") as "accepted" | "pending_received" | "pending_sent") || "accepted";
  const search = searchParams.get("search") || undefined;
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  const [connections, counts] = await Promise.all([
    listConnections(session.userId, filter, { limit, offset, search }),
    countConnections(session.userId),
  ]);

  return NextResponse.json({ connections, counts });
});

export const POST = withMetrics("/api/social/connections", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const body = await request.json();
  const { targetUserId, targetSlug } = body;

  let receiverId = targetUserId;
  if (!receiverId && targetSlug) {
    const profile = await getPublicProfileBySlug(targetSlug);
    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });
    receiverId = profile.userId;
  }

  if (!receiverId) return NextResponse.json({ error: "Target user required" }, { status: 400 });
  if (receiverId === session.userId) return NextResponse.json({ error: "Cannot connect with yourself" }, { status: 400 });

  try {
    const connection = await requestConnection(session.userId, receiverId);
    await trackEvent(session.userId, "connection_request", { targetUserId: receiverId }).catch(() => {});
    return NextResponse.json(connection, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || "Connection request failed";
    if (msg.includes("wait")) return NextResponse.json({ error: msg }, { status: 429 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
