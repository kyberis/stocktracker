import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { verifySessionToken } from "@/lib/auth/session";
import { createPost, listPostsByUser, getFeedFromItems, getPublicProfileBySlug, isConnected, trackEvent, getCommentCountsForPosts, fanOutPost } from "@/lib/db";
import { requireSocialEnabled } from "@/lib/social-gate";
import { sanitizeSocialPostHtml } from "@/lib/sanitize-social-html";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/social/posts", async (request: NextRequest) => {
  const gated = await requireSocialEnabled();
  if (gated) return gated;

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const feed = searchParams.get("feed");
  const postType = searchParams.get("type") as any;
  const cursor = searchParams.get("cursor") || undefined;
  const limit = parseInt(searchParams.get("limit") || "20");

  let viewerId: string | null = null;
  try {
    const cookie = request.cookies.get("trefolio_session")?.value;
    if (cookie) {
      const session = await verifySessionToken(cookie);
      if (session) viewerId = session.userId;
    }
  } catch {}

  if (feed === "true" && viewerId) {
    const posts = await getFeedFromItems(viewerId, { limit, cursor });
    const commentCounts = await getCommentCountsForPosts(posts.map(p => p.id));
    const postsWithCounts = posts.map(p => ({ ...p, commentCount: commentCounts[p.id] || 0 }));
    return NextResponse.json({ posts: postsWithCounts });
  }

  if (slug) {
    const profile = await getPublicProfileBySlug(slug);
    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isOwner = viewerId === profile.userId;
    const connected = viewerId && !isOwner ? await isConnected(viewerId, profile.userId) : false;

    if (profile.socialVisibility === "private" && !isOwner && !connected) {
      return NextResponse.json({ posts: [] });
    }

    const posts = await listPostsByUser(profile.userId, {
      viewerId: viewerId || undefined,
      isConnected: connected,
      postType: postType || undefined,
      limit,
      cursor,
    });
    const commentCounts = await getCommentCountsForPosts(posts.map(p => p.id));
    const postsWithCounts = posts.map(p => ({ ...p, commentCount: commentCounts[p.id] || 0 }));
    return NextResponse.json({ posts: postsWithCounts });
  }

  return NextResponse.json({ error: "Provide slug or feed=true" }, { status: 400 });
});

export const POST = withMetrics("/api/social/posts", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const gated = await requireSocialEnabled(session.userId);
  if (gated) return gated;

  const body = await request.json();
  const { title, content, contentFormat, visibility, postType, linkUrl, linkTitle, linkImage, isDraft } = body;

  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const format = typeof contentFormat === "string" ? contentFormat : "html";
  const safeContent = format === "html" || !contentFormat ? sanitizeSocialPostHtml(content) : content;

  const post = await createPost(session.userId, {
    title: title || "",
    content: safeContent,
    contentFormat,
    visibility,
    postType,
    linkUrl,
    linkTitle,
    linkImage,
    isDraft: isDraft ?? false,
  });

  if (!isDraft) {
    await fanOutPost(post.id, session.userId, post.visibility, post.publishedAt).catch(() => {});
    await trackEvent(session.userId, "post_publish", { postId: post.id, postType: post.postType, visibility: post.visibility }).catch(() => {});
  }

  return NextResponse.json(post, { status: 201 });
});
