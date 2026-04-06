import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getFeedFromItems, getCommentCountsForPosts } from "@/lib/db";
import { requireSocialEnabled } from "@/lib/social-gate";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/social/feed", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const gated = await requireSocialEnabled(session.userId);
  if (gated) return gated;

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") || undefined;
  const limit = parseInt(searchParams.get("limit") || "20");

  const posts = await getFeedFromItems(session.userId, { limit, cursor });
  const commentCounts = await getCommentCountsForPosts(posts.map(p => p.id));
  const postsWithCounts = posts.map(p => ({ ...p, commentCount: commentCounts[p.id] || 0 }));
  return NextResponse.json({ posts: postsWithCounts });
});
