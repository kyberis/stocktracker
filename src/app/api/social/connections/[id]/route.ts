import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { acceptConnection, rejectConnection, withdrawConnection, removeConnection, trackEvent, getConnectionById, backfillFeedForConnection, cleanupFeedForDisconnection } from "@/lib/db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const body = await request.json();
  const { action } = body;

  if (action === "accept") {
    const conn = await getConnectionById(id);
    const success = await acceptConnection(id, session.userId);
    if (!success) return NextResponse.json({ error: "Cannot accept this request" }, { status: 400 });
    if (conn) {
      await backfillFeedForConnection(conn.requesterId, conn.receiverId).catch(() => {});
    }
    await trackEvent(session.userId, "connection_accept", { connectionId: id }).catch(() => {});
    return NextResponse.json({ success: true });
  }

  if (action === "reject") {
    const success = await rejectConnection(id, session.userId);
    if (!success) return NextResponse.json({ error: "Cannot reject this request" }, { status: 400 });
    await trackEvent(session.userId, "connection_reject", { connectionId: id }).catch(() => {});
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const conn = await getConnectionById(id);

  const withdrawn = await withdrawConnection(id, session.userId);
  if (withdrawn) return NextResponse.json({ success: true });

  const removed = await removeConnection(id, session.userId);
  if (removed) {
    if (conn) {
      await cleanupFeedForDisconnection(conn.requesterId, conn.receiverId).catch(() => {});
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Connection not found" }, { status: 404 });
}
