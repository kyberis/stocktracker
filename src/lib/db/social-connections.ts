import { ensureInitialized } from "./client";
import { str, num, parseExperienceLevel } from "./helpers";
import { generateId } from "@/lib/utils";

export type ConnectionStatus = "pending" | "accepted" | "rejected" | "blocked";

export interface UserConnection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionWithUser {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  profileSlug: string;
  headline: string;
  experienceLevel: string;
  status: ConnectionStatus;
  connectedAt: string;
  connectionCount: number;
  postCount: number;
}

function parseStatus(val: unknown): ConnectionStatus {
  const s = String(val || "pending");
  if (s === "accepted" || s === "rejected" || s === "blocked") return s;
  return "pending";
}

const COOLDOWN_DAYS = 7;

export async function getConnectionById(connectionId: string): Promise<UserConnection | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM user_connections WHERE id = ?",
    args: [connectionId],
  });
  if (!result.rows.length) return null;
  const r = result.rows[0];
  return {
    id: str(r.id), requesterId: str(r.requester_id), receiverId: str(r.receiver_id),
    status: parseStatus(r.status), createdAt: str(r.created_at), updatedAt: str(r.updated_at),
  };
}

export async function getConnectionBetween(userA: string, userB: string): Promise<UserConnection | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM user_connections
          WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)`,
    args: [userA, userB, userB, userA],
  });
  if (!result.rows.length) return null;
  const r = result.rows[0];
  return {
    id: str(r.id), requesterId: str(r.requester_id), receiverId: str(r.receiver_id),
    status: parseStatus(r.status), createdAt: str(r.created_at), updatedAt: str(r.updated_at),
  };
}

export async function requestConnection(requesterId: string, receiverId: string): Promise<UserConnection> {
  const client = await ensureInitialized();

  const existing = await getConnectionBetween(requesterId, receiverId);
  if (existing) {
    if (existing.status === "blocked") throw new Error("Cannot connect with this user");
    if (existing.status === "accepted") throw new Error("Already connected");
    if (existing.status === "pending") throw new Error("Connection request already pending");
    if (existing.status === "rejected") {
      const updatedAt = new Date(existing.updatedAt);
      const cooldownEnd = new Date(updatedAt.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      if (new Date() < cooldownEnd) throw new Error("Please wait before re-requesting");
      await client.execute({
        sql: "UPDATE user_connections SET status = 'pending', requester_id = ?, receiver_id = ?, updated_at = datetime('now') WHERE id = ?",
        args: [requesterId, receiverId, existing.id],
      });
      return { ...existing, status: "pending", requesterId, receiverId, updatedAt: new Date().toISOString() };
    }
  }

  const id = generateId();
  await client.execute({
    sql: "INSERT INTO user_connections (id, requester_id, receiver_id, status) VALUES (?, ?, ?, 'pending')",
    args: [id, requesterId, receiverId],
  });
  return { id, requesterId, receiverId, status: "pending", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export async function acceptConnection(connectionId: string, userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "UPDATE user_connections SET status = 'accepted', updated_at = datetime('now') WHERE id = ? AND receiver_id = ? AND status = 'pending'",
    args: [connectionId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function rejectConnection(connectionId: string, userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "UPDATE user_connections SET status = 'rejected', updated_at = datetime('now') WHERE id = ? AND receiver_id = ? AND status = 'pending'",
    args: [connectionId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function withdrawConnection(connectionId: string, userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM user_connections WHERE id = ? AND requester_id = ? AND status = 'pending'",
    args: [connectionId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function removeConnection(connectionId: string, userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM user_connections WHERE id = ? AND (requester_id = ? OR receiver_id = ?) AND status = 'accepted'",
    args: [connectionId, userId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const client = await ensureInitialized();
  const existing = await getConnectionBetween(blockerId, blockedId);
  if (existing) {
    await client.execute({
      sql: "UPDATE user_connections SET status = 'blocked', requester_id = ?, receiver_id = ?, updated_at = datetime('now') WHERE id = ?",
      args: [blockerId, blockedId, existing.id],
    });
  } else {
    const id = generateId();
    await client.execute({
      sql: "INSERT INTO user_connections (id, requester_id, receiver_id, status) VALUES (?, ?, ?, 'blocked')",
      args: [id, blockerId, blockedId],
    });
  }
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "DELETE FROM user_connections WHERE requester_id = ? AND receiver_id = ? AND status = 'blocked'",
    args: [blockerId, blockedId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function isConnected(userA: string, userB: string): Promise<boolean> {
  const conn = await getConnectionBetween(userA, userB);
  return conn?.status === "accepted";
}

export async function listConnections(
  userId: string,
  filter: "accepted" | "pending_received" | "pending_sent",
  options?: { limit?: number; offset?: number; search?: string }
): Promise<ConnectionWithUser[]> {
  const client = await ensureInitialized();
  const limit = Math.min(options?.limit || 20, 50);
  const offset = options?.offset || 0;
  let sql = "";
  const args: (string | number | null)[] = [];

  if (filter === "accepted") {
    sql = `SELECT uc.id, uc.status, uc.updated_at as connected_at,
              CASE WHEN uc.requester_id = ? THEN uc.receiver_id ELSE uc.requester_id END as other_id,
              u.display_name, u.avatar_url, u.profile_slug, u.headline, u.experience_level,
              (SELECT COUNT(*) FROM user_connections WHERE (requester_id = u.id OR receiver_id = u.id) AND status = 'accepted') as connection_count,
              (SELECT COUNT(*) FROM social_posts WHERE user_id = u.id AND is_draft = 0) as post_count
            FROM user_connections uc
            JOIN users u ON u.id = CASE WHEN uc.requester_id = ? THEN uc.receiver_id ELSE uc.requester_id END
            WHERE (uc.requester_id = ? OR uc.receiver_id = ?) AND uc.status = 'accepted'`;
    args.push(userId, userId, userId, userId);
  } else if (filter === "pending_received") {
    sql = `SELECT uc.id, uc.status, uc.created_at as connected_at,
              uc.requester_id as other_id,
              u.display_name, u.avatar_url, u.profile_slug, u.headline, u.experience_level,
              (SELECT COUNT(*) FROM user_connections WHERE (requester_id = u.id OR receiver_id = u.id) AND status = 'accepted') as connection_count,
              (SELECT COUNT(*) FROM social_posts WHERE user_id = u.id AND is_draft = 0) as post_count
            FROM user_connections uc
            JOIN users u ON u.id = uc.requester_id
            WHERE uc.receiver_id = ? AND uc.status = 'pending'`;
    args.push(userId);
  } else {
    sql = `SELECT uc.id, uc.status, uc.created_at as connected_at,
              uc.receiver_id as other_id,
              u.display_name, u.avatar_url, u.profile_slug, u.headline, u.experience_level,
              (SELECT COUNT(*) FROM user_connections WHERE (requester_id = u.id OR receiver_id = u.id) AND status = 'accepted') as connection_count,
              (SELECT COUNT(*) FROM social_posts WHERE user_id = u.id AND is_draft = 0) as post_count
            FROM user_connections uc
            JOIN users u ON u.id = uc.receiver_id
            WHERE uc.requester_id = ? AND uc.status = 'pending'`;
    args.push(userId);
  }

  if (options?.search) {
    sql += " AND (u.display_name LIKE ? OR u.profile_slug LIKE ?)";
    const term = `%${options.search}%`;
    args.push(term, term);
  }

  sql += " ORDER BY connected_at DESC LIMIT ? OFFSET ?";
  args.push(limit, offset);

  const result = await client.execute({ sql, args });
  return result.rows.map((r) => ({
    id: str(r.id),
    userId: str(r.other_id),
    displayName: str(r.display_name),
    avatarUrl: str(r.avatar_url),
    profileSlug: str(r.profile_slug),
    headline: str(r.headline),
    experienceLevel: parseExperienceLevel(r.experience_level),
    status: parseStatus(r.status),
    connectedAt: str(r.connected_at),
    connectionCount: num(r.connection_count),
    postCount: num(r.post_count),
  }));
}

export async function countConnections(userId: string): Promise<{ accepted: number; pendingReceived: number; pendingSent: number }> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT
            (SELECT COUNT(*) FROM user_connections WHERE (requester_id = ? OR receiver_id = ?) AND status = 'accepted') as accepted,
            (SELECT COUNT(*) FROM user_connections WHERE receiver_id = ? AND status = 'pending') as pending_received,
            (SELECT COUNT(*) FROM user_connections WHERE requester_id = ? AND status = 'pending') as pending_sent`,
    args: [userId, userId, userId, userId],
  });
  const r = result.rows[0];
  return { accepted: num(r.accepted), pendingReceived: num(r.pending_received), pendingSent: num(r.pending_sent) };
}

export async function searchPeople(
  query: string,
  options?: {
    experienceLevel?: string;
    hasPosts?: boolean;
    hasConnections?: boolean;
    viewerId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ConnectionWithUser[]> {
  const client = await ensureInitialized();
  const conditions = ["u.profile_slug != ''", "u.social_visibility = 'public'"];
  const args: (string | number | null)[] = [];

  if (query) {
    conditions.push("(u.display_name LIKE ? OR u.profile_slug LIKE ? OR u.headline LIKE ?)");
    const term = `%${query}%`;
    args.push(term, term, term);
  }

  if (options?.experienceLevel) {
    conditions.push("u.experience_level = ?");
    args.push(options.experienceLevel);
  }

  if (options?.viewerId) {
    conditions.push("u.id != ?");
    args.push(options.viewerId);
    conditions.push(`u.id NOT IN (SELECT CASE WHEN requester_id = ? THEN receiver_id ELSE requester_id END FROM user_connections WHERE (requester_id = ? OR receiver_id = ?) AND status = 'blocked')`);
    args.push(options.viewerId, options.viewerId, options.viewerId);
  }

  const havingClauses: string[] = [];
  if (options?.hasPosts) havingClauses.push("post_count > 0");
  if (options?.hasConnections) havingClauses.push("connection_count > 0");

  const limit = Math.min(options?.limit || 20, 50);
  const offset = options?.offset || 0;

  const havingSql = havingClauses.length ? `HAVING ${havingClauses.join(" AND ")}` : "";

  args.push(limit, offset);

  const result = await client.execute({
    sql: `SELECT u.id as other_id, u.display_name, u.avatar_url, u.profile_slug, u.headline, u.experience_level,
            (SELECT COUNT(*) FROM user_connections WHERE (requester_id = u.id OR receiver_id = u.id) AND status = 'accepted') as connection_count,
            (SELECT COUNT(*) FROM social_posts WHERE user_id = u.id AND is_draft = 0) as post_count
          FROM users u
          WHERE ${conditions.join(" AND ")}
          GROUP BY u.id
          ${havingSql}
          ORDER BY connection_count DESC, u.display_name ASC
          LIMIT ? OFFSET ?`,
    args,
  });

  return result.rows.map((r) => ({
    id: "",
    userId: str(r.other_id),
    displayName: str(r.display_name),
    avatarUrl: str(r.avatar_url),
    profileSlug: str(r.profile_slug),
    headline: str(r.headline),
    experienceLevel: parseExperienceLevel(r.experience_level),
    status: "pending" as ConnectionStatus,
    connectedAt: "",
    connectionCount: num(r.connection_count),
    postCount: num(r.post_count),
  }));
}
