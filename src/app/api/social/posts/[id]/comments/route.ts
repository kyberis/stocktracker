import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { verifySessionToken } from "@/lib/auth/session";
import {
  getPostById,
  listComments,
  addComment,
  isPostAuthorAllowingComments,
  isConnected,
  trackEvent,
} from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const post = await getPostById(id);
  if (!post || post.isDraft) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  let viewerId: string | null = null;
  try {
    const cookie = request.cookies.get("trefolio_session")?.value;
    if (cookie) {
      const session = await verifySessionToken(cookie);
      if (session) viewerId = session.userId;
    }
  } catch {}

  const isOwner = viewerId === post.userId;
  if (post.visibility === "private" && !isOwner) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.visibility === "network" && !isOwner) {
    const connected = viewerId ? await isConnected(viewerId, post.userId) : false;
    if (!connected) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 50, 100);

  const allowComments = await isPostAuthorAllowingComments(id);
  const { comments, total } = await listComments(id, { limit, cursor });

  return NextResponse.json({ comments, total, allowComments });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const post = await getPostById(id);
  if (!post || post.isDraft) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.visibility === "private" && session.userId !== post.userId) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.visibility === "network" && session.userId !== post.userId) {
    const connected = await isConnected(session.userId, post.userId);
    if (!connected) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const allowComments = await isPostAuthorAllowingComments(id);
  if (!allowComments) {
    return NextResponse.json({ error: "Comments are disabled for this post" }, { status: 403 });
  }

  const body = await request.json();
  const content = (body.content || "").trim();
  if (!content || content.length > 2000) {
    return NextResponse.json({ error: "Comment must be 1-2000 characters" }, { status: 400 });
  }

  const parentId = body.parentId || null;

  const comment = await addComment(id, session.userId, content, parentId);

  await trackEvent(session.userId, "post_comment", {
    postId: id,
    commentId: comment.id,
    isReply: String(!!parentId),
  }).catch(() => {});

  return NextResponse.json(comment, { status: 201 });
}
