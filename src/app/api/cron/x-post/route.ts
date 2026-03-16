import { NextRequest, NextResponse } from "next/server";
import { listDueXPosts, updateXPostStatus } from "@/lib/db";
import { postTweet } from "@/lib/x-client";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function runPostDueTweets(): Promise<Record<string, unknown>> {
  const duePosts = await listDueXPosts();
  if (duePosts.length === 0) return { checked: true, due: 0, posted: 0 };

  let posted = 0;
  let failed = 0;

  for (const post of duePosts) {
    const fullText = post.hashtags
      ? `${post.content}\n\n${post.hashtags}`
      : post.content;

    const result = await postTweet(fullText);

    if (result.success) {
      await updateXPostStatus(post.id, "posted", { xPostId: result.tweetId });
      posted++;
    } else {
      await updateXPostStatus(post.id, "failed", { errorMessage: result.error });
      failed++;
    }
  }

  return { checked: true, due: duePosts.length, posted, failed };
}

const handler = withCronLogging("x-post", runPostDueTweets);

export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("x-post", req.headers.get("authorization"));
  if (denied) return denied;
  return handler();
}
