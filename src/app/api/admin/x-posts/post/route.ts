import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getXPostById, updateXPostStatus } from "@/lib/db";
import { postTweet } from "@/lib/x-client";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/admin/x-posts/post", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let body: { id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const post = await getXPostById(body.id);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.status === "posted") {
    return NextResponse.json({ error: "Post already published" }, { status: 409 });
  }

  const fullText = post.hashtags
    ? `${post.content}\n\n${post.hashtags}`
    : post.content;

  const result = await postTweet(fullText);

  if (result.success) {
    await updateXPostStatus(post.id, "posted", { xPostId: result.tweetId });
    return NextResponse.json({ ok: true, xPostId: result.tweetId });
  }

  await updateXPostStatus(post.id, "failed", { errorMessage: result.error });
  return NextResponse.json({ error: result.error }, { status: 502 });
});
