import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { updateComment, deleteComment } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const { commentId } = await params;
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const body = await request.json();
  const content = (body.content || "").trim();
  if (!content || content.length > 2000) {
    return NextResponse.json({ error: "Comment must be 1-2000 characters" }, { status: 400 });
  }

  const success = await updateComment(commentId, session.userId, content);
  if (!success) {
    return NextResponse.json({ error: "Comment not found or not authorized" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const { commentId } = await params;
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const success = await deleteComment(commentId, session.userId);
  if (!success) {
    return NextResponse.json({ error: "Comment not found or not authorized" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
