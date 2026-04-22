import { ensureInitialized } from "./client";
import { str, num, parseExperienceLevel } from "./helpers";
import { generateId } from "@/lib/utils";

export type PostType = "article" | "analysis" | "trade_idea" | "portfolio_update" | "link";
export type PostVisibility = "public" | "network" | "private";

export const VALID_POST_TYPES = new Set<PostType>(["article", "analysis", "trade_idea", "portfolio_update", "link"]);
export const VALID_VISIBILITIES = new Set<PostVisibility>(["public", "network", "private"]);

export function isPostType(val: unknown): val is PostType {
  return typeof val === "string" && VALID_POST_TYPES.has(val as PostType);
}

export function isVisibility(val: unknown): val is PostVisibility {
  return typeof val === "string" && VALID_VISIBILITIES.has(val as PostVisibility);
}

export interface SocialPost {
  id: string;
  userId: string;
  title: string;
  content: string;
  contentFormat: string;
  visibility: PostVisibility;
  postType: PostType;
  linkUrl: string;
  linkTitle: string;
  linkImage: string;
  isDraft: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialPostWithAuthor extends SocialPost {
  authorName: string;
  authorAvatar: string;
  authorSlug: string;
  authorExperience: string;
}

export interface SocialPostImage {
  id: string;
  postId: string;
  url: string;
  altText: string;
  sortOrder: number;
}

export function parsePostType(val: unknown): PostType {
  const s = String(val || "article");
  return VALID_POST_TYPES.has(s as PostType) ? (s as PostType) : "article";
}

export function parseVisibility(val: unknown): PostVisibility {
  const s = String(val || "public");
  return VALID_VISIBILITIES.has(s as PostVisibility) ? (s as PostVisibility) : "public";
}

function mapPostRow(r: Record<string, unknown>): SocialPost {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    title: str(r.title),
    content: str(r.content),
    contentFormat: str(r.content_format) || "html",
    visibility: parseVisibility(r.visibility),
    postType: parsePostType(r.post_type),
    linkUrl: str(r.link_url),
    linkTitle: str(r.link_title),
    linkImage: str(r.link_image),
    isDraft: num(r.is_draft) === 1,
    publishedAt: str(r.published_at),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

function mapPostWithAuthor(r: Record<string, unknown>): SocialPostWithAuthor {
  return {
    ...mapPostRow(r),
    authorName: str(r.display_name),
    authorAvatar: str(r.avatar_url),
    authorSlug: str(r.profile_slug),
    authorExperience: parseExperienceLevel(r.experience_level),
  };
}

export async function createPost(
  userId: string,
  data: {
    title: string;
    content: string;
    contentFormat?: string;
    visibility?: PostVisibility;
    postType?: PostType;
    linkUrl?: string;
    linkTitle?: string;
    linkImage?: string;
    isDraft?: boolean;
  }
): Promise<SocialPost> {
  const client = await ensureInitialized();
  const id = generateId();
  const now = new Date().toISOString();
  const isDraft = data.isDraft ?? false;
  const publishedAt = isDraft ? null : now;

  await client.execute({
    sql: `INSERT INTO social_posts (id, user_id, title, content, content_format, visibility, post_type, link_url, link_title, link_image, is_draft, published_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, userId, data.title, data.content,
      data.contentFormat || "html",
      data.visibility || "public",
      data.postType || "article",
      data.linkUrl || "", data.linkTitle || "", data.linkImage || "",
      isDraft ? 1 : 0, publishedAt, now, now,
    ],
  });

  return {
    id, userId, title: data.title, content: data.content,
    contentFormat: data.contentFormat || "html",
    visibility: data.visibility || "public",
    postType: data.postType || "article",
    linkUrl: data.linkUrl || "", linkTitle: data.linkTitle || "", linkImage: data.linkImage || "",
    isDraft, publishedAt: publishedAt || "", createdAt: now, updatedAt: now,
  };
}

export async function updatePost(
  postId: string,
  userId: string,
  data: {
    title?: string;
    content?: string;
    visibility?: PostVisibility;
    postType?: PostType;
    linkUrl?: string;
    linkTitle?: string;
    linkImage?: string;
    isDraft?: boolean;
  }
): Promise<boolean> {
  const client = await ensureInitialized();
  const sets: string[] = ["updated_at = datetime('now')"];
  const args: (string | number | null)[] = [];

  if (data.title !== undefined) { sets.push("title = ?"); args.push(data.title); }
  if (data.content !== undefined) { sets.push("content = ?"); args.push(data.content); }
  if (data.visibility !== undefined) { sets.push("visibility = ?"); args.push(data.visibility); }
  if (data.postType !== undefined) { sets.push("post_type = ?"); args.push(data.postType); }
  if (data.linkUrl !== undefined) { sets.push("link_url = ?"); args.push(data.linkUrl); }
  if (data.linkTitle !== undefined) { sets.push("link_title = ?"); args.push(data.linkTitle); }
  if (data.linkImage !== undefined) { sets.push("link_image = ?"); args.push(data.linkImage); }
  if (data.isDraft !== undefined) {
    sets.push("is_draft = ?");
    args.push(data.isDraft ? 1 : 0);
    if (!data.isDraft) {
      sets.push("published_at = COALESCE(published_at, datetime('now'))");
    }
  }

  args.push(postId, userId);
  const result = await client.execute({
    sql: `UPDATE social_posts SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function deletePost(postId: string, userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM social_posts WHERE id = ? AND user_id = ?",
    args: [postId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function getPostById(postId: string): Promise<SocialPostWithAuthor | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT p.*, u.display_name, u.avatar_url, u.profile_slug, u.experience_level
          FROM social_posts p JOIN users u ON p.user_id = u.id
          WHERE p.id = ?`,
    args: [postId],
  });
  if (!result.rows.length) return null;
  return mapPostWithAuthor(result.rows[0] as Record<string, unknown>);
}

export async function listPostsByUser(
  userId: string,
  options?: { viewerId?: string; isConnected?: boolean; postType?: PostType; limit?: number; cursor?: string }
): Promise<SocialPostWithAuthor[]> {
  const client = await ensureInitialized();
  const conditions = ["p.user_id = ?"];
  const args: (string | number | null)[] = [userId];

  if (options?.viewerId === userId) {
    // Owner sees everything including drafts
  } else if (options?.isConnected) {
    conditions.push("p.is_draft = 0");
    conditions.push("p.visibility IN ('public', 'network')");
  } else {
    conditions.push("p.is_draft = 0");
    conditions.push("p.visibility = 'public'");
  }

  if (options?.postType) {
    conditions.push("p.post_type = ?");
    args.push(options.postType);
  }

  if (options?.cursor) {
    conditions.push("p.published_at < ?");
    args.push(options.cursor);
  }

  const limit = Math.min(options?.limit || 20, 50);
  args.push(limit);

  const result = await client.execute({
    sql: `SELECT p.*, u.display_name, u.avatar_url, u.profile_slug, u.experience_level
          FROM social_posts p JOIN users u ON p.user_id = u.id
          WHERE ${conditions.join(" AND ")}
          ORDER BY COALESCE(p.published_at, p.created_at) DESC
          LIMIT ?`,
    args,
  });
  return result.rows.map((r) => mapPostWithAuthor(r as Record<string, unknown>));
}

export async function getFeed(
  userId: string,
  options?: { limit?: number; cursor?: string }
): Promise<SocialPostWithAuthor[]> {
  const client = await ensureInitialized();
  const limit = Math.min(options?.limit || 20, 50);
  const args: (string | number | null)[] = [userId, userId, userId];
  let cursorClause = "";

  if (options?.cursor) {
    cursorClause = "AND p.published_at < ?";
    args.push(options.cursor);
  }

  args.push(limit);

  const result = await client.execute({
    sql: `SELECT p.*, u.display_name, u.avatar_url, u.profile_slug, u.experience_level
          FROM social_posts p
          JOIN users u ON p.user_id = u.id
          WHERE p.is_draft = 0
            AND p.published_at IS NOT NULL
            AND (
              p.user_id = ?
              OR (p.visibility = 'public')
              OR (p.visibility = 'network' AND p.user_id IN (
                SELECT CASE WHEN requester_id = ? THEN receiver_id ELSE requester_id END
                FROM user_connections
                WHERE (requester_id = ? OR receiver_id = ?) AND status = 'accepted'
              ))
            )
            ${cursorClause}
          ORDER BY p.published_at DESC
          LIMIT ?`,
    args: [...args.slice(0, 3), userId, ...args.slice(3)],
  });
  return result.rows.map((r) => mapPostWithAuthor(r as Record<string, unknown>));
}

export async function addPostImage(postId: string, url: string, altText: string, sortOrder: number): Promise<SocialPostImage> {
  const client = await ensureInitialized();
  const id = generateId();
  await client.execute({
    sql: "INSERT INTO social_post_images (id, post_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?, ?)",
    args: [id, postId, url, altText, sortOrder],
  });
  return { id, postId, url, altText, sortOrder };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export interface SocialPostComment {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorSlug: string;
  authorAvatar: string;
}

function mapCommentRow(r: Record<string, unknown>): SocialPostComment {
  return {
    id: str(r.id),
    postId: str(r.post_id),
    userId: str(r.user_id),
    parentId: r.parent_id ? str(r.parent_id) : null,
    content: str(r.content),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
    authorName: str(r.display_name),
    authorSlug: str(r.profile_slug),
    authorAvatar: str(r.avatar_url),
  };
}

export async function addComment(
  postId: string,
  userId: string,
  content: string,
  parentId?: string | null,
): Promise<SocialPostComment> {
  const client = await ensureInitialized();
  const id = generateId();
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO social_post_comments (id, post_id, user_id, parent_id, content, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, postId, userId, parentId || null, content, now, now],
  });
  const result = await client.execute({
    sql: `SELECT c.*, u.display_name, u.profile_slug, u.avatar_url
          FROM social_post_comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
    args: [id],
  });
  return mapCommentRow(result.rows[0] as Record<string, unknown>);
}

export async function updateComment(commentId: string, userId: string, content: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "UPDATE social_post_comments SET content = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
    args: [content, commentId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function deleteComment(commentId: string, userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM social_post_comments WHERE id = ? AND user_id = ?",
    args: [commentId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function listComments(
  postId: string,
  options?: { limit?: number; cursor?: string },
): Promise<{ comments: SocialPostComment[]; total: number }> {
  const client = await ensureInitialized();
  const limit = Math.min(options?.limit || 50, 100);
  const args: (string | number | null)[] = [postId];
  let cursorClause = "";

  if (options?.cursor) {
    cursorClause = "AND c.created_at > ?";
    args.push(options.cursor);
  }

  args.push(limit);

  const [commentsResult, countResult] = await Promise.all([
    client.execute({
      sql: `SELECT c.*, u.display_name, u.profile_slug, u.avatar_url
            FROM social_post_comments c JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ? ${cursorClause}
            ORDER BY c.created_at ASC
            LIMIT ?`,
      args,
    }),
    client.execute({
      sql: "SELECT COUNT(*) as cnt FROM social_post_comments WHERE post_id = ?",
      args: [postId],
    }),
  ]);

  return {
    comments: commentsResult.rows.map((r) => mapCommentRow(r as Record<string, unknown>)),
    total: num((countResult.rows[0] as Record<string, unknown>).cnt),
  };
}

export async function getCommentCount(postId: string): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT COUNT(*) as cnt FROM social_post_comments WHERE post_id = ?",
    args: [postId],
  });
  return num((result.rows[0] as Record<string, unknown>).cnt);
}

export async function getCommentCountsForPosts(postIds: string[]): Promise<Record<string, number>> {
  if (!postIds.length) return {};
  const client = await ensureInitialized();
  const placeholders = postIds.map(() => "?").join(",");
  const result = await client.execute({
    sql: `SELECT post_id, COUNT(*) as cnt FROM social_post_comments WHERE post_id IN (${placeholders}) GROUP BY post_id`,
    args: postIds,
  });
  const counts: Record<string, number> = {};
  for (const r of result.rows) {
    const row = r as Record<string, unknown>;
    counts[str(row.post_id)] = num(row.cnt);
  }
  return counts;
}

export async function isPostAuthorAllowingComments(postId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT u.allow_comments FROM social_posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
    args: [postId],
  });
  if (!result.rows.length) return false;
  return num((result.rows[0] as Record<string, unknown>).allow_comments ?? 1) === 1;
}

export async function listPostImages(postId: string): Promise<SocialPostImage[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM social_post_images WHERE post_id = ? ORDER BY sort_order",
    args: [postId],
  });
  return result.rows.map((r) => ({
    id: str(r.id),
    postId: str(r.post_id),
    url: str(r.url),
    altText: str(r.alt_text),
    sortOrder: num(r.sort_order),
  }));
}
