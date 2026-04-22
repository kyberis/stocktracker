import { ensureInitialized } from "./client";
import { str, num, parseExperienceLevel } from "./helpers";
import { parsePostType, parseVisibility, type SocialPostWithAuthor } from "./social-posts";

/**
 * Fan-out-on-write feed system.
 *
 * feed_items stores (user_id, post_id) pairs. When a post is published,
 * we insert a row for the author + each of their accepted connections
 * (filtered by visibility). Reads become a simple indexed scan.
 */

function getRecipientQuery(visibility: string): string {
  if (visibility === "public") {
    // All platform users — but to avoid unbounded growth we fan out to
    // the author + their connections. Public posts from non-connections
    // are surfaced through Explore/Search, not the home feed.
    // This keeps the feed intentional (your network) while still showing
    // all of your own public posts.
    return "connections_plus_self";
  }
  if (visibility === "network") {
    return "connections_plus_self";
  }
  // private — only author
  return "self_only";
}

async function getAcceptedConnectionIds(userId: string): Promise<string[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT CASE WHEN requester_id = ? THEN receiver_id ELSE requester_id END as other_id
          FROM user_connections
          WHERE (requester_id = ? OR receiver_id = ?) AND status = 'accepted'`,
    args: [userId, userId, userId],
  });
  return result.rows.map((r) => str((r as Record<string, unknown>).other_id));
}

/**
 * Fan out a published post to relevant feeds.
 * Call after creating/publishing a post (not for drafts).
 */
export async function fanOutPost(
  postId: string,
  authorId: string,
  visibility: string,
  publishedAt: string,
): Promise<void> {
  const strategy = getRecipientQuery(visibility);

  const recipients = [authorId];
  if (strategy === "connections_plus_self") {
    const connectionIds = await getAcceptedConnectionIds(authorId);
    recipients.push(...connectionIds);
  }

  if (!recipients.length) return;

  const client = await ensureInitialized();

  // Batch insert in chunks of 50 to stay within SQLite parameter limits
  const CHUNK = 50;
  for (let i = 0; i < recipients.length; i += CHUNK) {
    const chunk = recipients.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => "(?, ?, ?, ?)").join(", ");
    const args: (string | number | null)[] = [];
    for (const uid of chunk) {
      args.push(uid, postId, authorId, publishedAt);
    }
    await client.execute({
      sql: `INSERT OR IGNORE INTO feed_items (user_id, post_id, author_id, published_at) VALUES ${placeholders}`,
      args,
    });
  }
}

/**
 * Remove all feed_items for a post (on post delete or unpublish).
 */
export async function removeFanOut(postId: string): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: "DELETE FROM feed_items WHERE post_id = ?",
    args: [postId],
  });
}

/**
 * When a post's visibility changes, re-fan-out.
 */
export async function refanOutPost(
  postId: string,
  authorId: string,
  newVisibility: string,
  publishedAt: string,
): Promise<void> {
  await removeFanOut(postId);
  await fanOutPost(postId, authorId, newVisibility, publishedAt);
}

/**
 * Backfill: when two users become connected, add each other's
 * public + network posts to the other's feed.
 */
export async function backfillFeedForConnection(userA: string, userB: string): Promise<void> {
  const client = await ensureInitialized();

  // Add userB's visible posts to userA's feed
  await client.execute({
    sql: `INSERT OR IGNORE INTO feed_items (user_id, post_id, author_id, published_at)
          SELECT ?, p.id, p.user_id, p.published_at
          FROM social_posts p
          WHERE p.user_id = ? AND p.is_draft = 0 AND p.published_at IS NOT NULL
            AND p.visibility IN ('public', 'network')`,
    args: [userA, userB],
  });

  // Add userA's visible posts to userB's feed
  await client.execute({
    sql: `INSERT OR IGNORE INTO feed_items (user_id, post_id, author_id, published_at)
          SELECT ?, p.id, p.user_id, p.published_at
          FROM social_posts p
          WHERE p.user_id = ? AND p.is_draft = 0 AND p.published_at IS NOT NULL
            AND p.visibility IN ('public', 'network')`,
    args: [userB, userA],
  });
}

/**
 * Cleanup: when a connection is removed, remove each other's
 * network-only posts from the other's feed.
 * Public posts stay since they'd appear anyway via future connections.
 * The author's own posts are never removed from their own feed.
 */
export async function cleanupFeedForDisconnection(userA: string, userB: string): Promise<void> {
  const client = await ensureInitialized();

  // Remove userB's network-only posts from userA's feed
  await client.execute({
    sql: `DELETE FROM feed_items
          WHERE user_id = ? AND author_id = ? AND post_id IN (
            SELECT id FROM social_posts WHERE visibility = 'network'
          )`,
    args: [userA, userB],
  });

  // Remove userA's network-only posts from userB's feed
  await client.execute({
    sql: `DELETE FROM feed_items
          WHERE user_id = ? AND author_id = ? AND post_id IN (
            SELECT id FROM social_posts WHERE visibility = 'network'
          )`,
    args: [userB, userA],
  });
}

/**
 * Read the feed — simple indexed query. This is the hot path.
 */
export async function getFeedFromItems(
  userId: string,
  options?: { limit?: number; cursor?: string },
): Promise<SocialPostWithAuthor[]> {
  const client = await ensureInitialized();
  const limit = Math.min(options?.limit || 20, 50);
  const args: (string | number | null)[] = [userId];
  let cursorClause = "";

  if (options?.cursor) {
    cursorClause = "AND fi.published_at < ?";
    args.push(options.cursor);
  }

  args.push(limit);

  const result = await client.execute({
    sql: `SELECT p.*, u.display_name, u.avatar_url, u.profile_slug, u.experience_level
          FROM feed_items fi
          JOIN social_posts p ON fi.post_id = p.id
          JOIN users u ON p.user_id = u.id
          WHERE fi.user_id = ? ${cursorClause}
          ORDER BY fi.published_at DESC
          LIMIT ?`,
    args,
  });

  return result.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: str(row.id),
      userId: str(row.user_id),
      title: str(row.title),
      content: str(row.content),
      contentFormat: str(row.content_format) || "html",
      visibility: parseVisibility(row.visibility),
      postType: parsePostType(row.post_type),
      linkUrl: str(row.link_url),
      linkTitle: str(row.link_title),
      linkImage: str(row.link_image),
      isDraft: num(row.is_draft) === 1,
      publishedAt: str(row.published_at),
      createdAt: str(row.created_at),
      updatedAt: str(row.updated_at),
      authorName: str(row.display_name),
      authorAvatar: str(row.avatar_url),
      authorSlug: str(row.profile_slug),
      authorExperience: parseExperienceLevel(row.experience_level),
    };
  });
}

/**
 * One-time seed: populate feed_items from existing posts/connections.
 * Safe to call multiple times (INSERT OR IGNORE).
 */
export async function seedFeedItems(): Promise<number> {
  const client = await ensureInitialized();

  // 1. Every author gets their own published posts in their feed
  const selfResult = await client.execute({
    sql: `INSERT OR IGNORE INTO feed_items (user_id, post_id, author_id, published_at)
          SELECT p.user_id, p.id, p.user_id, p.published_at
          FROM social_posts p
          WHERE p.is_draft = 0 AND p.published_at IS NOT NULL`,
    args: [],
  });

  // 2. For each accepted connection, add public + network posts
  const connResult = await client.execute({
    sql: `INSERT OR IGNORE INTO feed_items (user_id, post_id, author_id, published_at)
          SELECT
            CASE WHEN uc.requester_id = p.user_id THEN uc.receiver_id ELSE uc.requester_id END,
            p.id, p.user_id, p.published_at
          FROM social_posts p
          JOIN user_connections uc ON (
            (uc.requester_id = p.user_id OR uc.receiver_id = p.user_id)
            AND uc.status = 'accepted'
          )
          WHERE p.is_draft = 0 AND p.published_at IS NOT NULL
            AND p.visibility IN ('public', 'network')`,
    args: [],
  });

  return (selfResult.rowsAffected ?? 0) + (connResult.rowsAffected ?? 0);
}
