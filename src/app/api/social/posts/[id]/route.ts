import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { verifySessionToken } from "@/lib/auth/session";
import { getPostById, updatePost, deletePost, isConnected, trackEvent, fanOutPost, removeFanOut, refanOutPost } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  let viewerId: string | null = null;
  try {
    const cookie = request.cookies.get("trefolio_session")?.value;
    if (cookie) {
      const session = await verifySessionToken(cookie);
      if (session) viewerId = session.userId;
    }
  } catch {}

  const isOwner = viewerId === post.userId;
  if (post.isDraft && !isOwner) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.visibility === "private" && !isOwner) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.visibility === "network" && !isOwner) {
    const connected = viewerId ? await isConnected(viewerId, post.userId) : false;
    if (!connected) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await trackEvent(post.userId, "post_view", { postId: id, slug: post.authorSlug }).catch(() => {});
  return NextResponse.json({ ...post, isOwner, viewerId });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const body = await request.json();
  const postBefore = await getPostById(id);
  const success = await updatePost(id, session.userId, body);
  if (!success) return NextResponse.json({ error: "Post not found or not authorized" }, { status: 404 });

  const updated = await getPostById(id);

  if (updated && postBefore) {
    const wasDraft = postBefore.isDraft;
    const visibilityChanged = postBefore.visibility !== updated.visibility;
    const justPublished = wasDraft && !updated.isDraft;

    if (justPublished) {
      await fanOutPost(id, session.userId, updated.visibility, updated.publishedAt).catch(() => {});
    } else if (visibilityChanged && !updated.isDraft) {
      await refanOutPost(id, session.userId, updated.visibility, updated.publishedAt).catch(() => {});
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const success = await deletePost(id, session.userId);
  if (!success) return NextResponse.json({ error: "Post not found or not authorized" }, { status: 404 });
  await removeFanOut(id).catch(() => {});
  return NextResponse.json({ success: true });
}
