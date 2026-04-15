import type { Client } from "@libsql/client";
import { ensureInitialized } from "./client";
import { str } from "./helpers";
import { generateId } from "@/lib/utils";

export type PrivateChatMessageType =
  | "text"
  | "link"
  | "image"
  | "audio"
  | "holding"
  | "allocation"
  | "summary"
  | "stock_pick";

/** `admin_link`: join via shared URL (max 2). `social_direct`: 1:1 network chat; invitee must accept. */
export type PrivateChatRoomKind = "admin_link" | "social_direct";

export type PrivateChatMembershipStatus = "active" | "pending";

export interface PrivateChatRoom {
  id: string;
  createdBy: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  kind: PrivateChatRoomKind;
}

export interface PrivateChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: PrivateChatMessageType;
  content: string;
  createdAt: string;
  expiresAt: string;
  replyToId: string;
  editedAt: string;
  isPersistent: boolean;
}

export interface PrivateChatParticipant {
  userId: string;
  displayName: string;
  avatarUrl: string;
  joinedAt: string;
  lastTypingAt: string;
  lastSeenAt: string;
  lastReadMsgId: string;
  clearedAt: string;
  membershipStatus: PrivateChatMembershipStatus;
}

export interface PrivateChatRoomListItem extends PrivateChatRoom {
  messageCount: number;
}

const VALID_MSG_TYPES = new Set<PrivateChatMessageType>([
  "text",
  "link",
  "image",
  "audio",
  "holding",
  "allocation",
  "summary",
  "stock_pick",
]);

function parseMessageType(val: unknown): PrivateChatMessageType {
  const s = String(val || "text");
  if (VALID_MSG_TYPES.has(s as PrivateChatMessageType)) return s as PrivateChatMessageType;
  return "text";
}

function mapMessageRow(r: Record<string, unknown>): PrivateChatMessage {
  return {
    id: str(r.id),
    roomId: str(r.room_id),
    senderId: str(r.sender_id),
    senderName: str(r.display_name) || str(r.sender_id),
    senderAvatar: str(r.avatar_url),
    type: parseMessageType(r.type),
    content: str(r.content),
    createdAt: str(r.created_at),
    expiresAt: str(r.expires_at),
    replyToId: str(r.reply_to_id),
    editedAt: str(r.edited_at),
    isPersistent: Number(r.is_persistent) === 1,
  };
}

function parseRoomKind(val: unknown): PrivateChatRoomKind {
  const s = String(val || "admin_link");
  return s === "social_direct" ? "social_direct" : "admin_link";
}

export async function createPrivateChatRoom(
  createdBy: string,
  label: string
): Promise<PrivateChatRoom> {
  const client = await ensureInitialized();
  const id = generateId();
  await client.execute({
    sql: `INSERT INTO private_chat_rooms (id, created_by, label, kind) VALUES (?, ?, ?, 'admin_link')`,
    args: [id, createdBy, label],
  });
  return { id, createdBy, label, isActive: true, createdAt: new Date().toISOString(), kind: "admin_link" };
}

export async function getPrivateChatRoom(id: string): Promise<PrivateChatRoom | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT * FROM private_chat_rooms WHERE id = ? AND is_active = 1`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: str(r.id),
    createdBy: str(r.created_by),
    label: str(r.label),
    isActive: true,
    createdAt: str(r.created_at),
    kind: parseRoomKind(r.kind),
  };
}

export async function deactivatePrivateChatRoom(id: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `UPDATE private_chat_rooms SET is_active = 0 WHERE id = ?`,
    args: [id],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function listPrivateChatRooms(
  adminUserId: string
): Promise<PrivateChatRoomListItem[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT r.*, COUNT(m.id) as message_count
          FROM private_chat_rooms r
          LEFT JOIN private_chat_messages m ON m.room_id = r.id
          WHERE r.created_by = ?
          GROUP BY r.id
          ORDER BY r.created_at DESC`,
    args: [adminUserId],
  });
  return result.rows.map((r) => ({
    id: str(r.id),
    createdBy: str(r.created_by),
    label: str(r.label),
    isActive: Number(r.is_active) === 1,
    createdAt: str(r.created_at),
    kind: parseRoomKind(r.kind),
    messageCount: Number(r.message_count) || 0,
  }));
}

const MSG_SELECT = `SELECT m.*, u.display_name, u.avatar_url
  FROM private_chat_messages m
  JOIN users u ON u.id = m.sender_id`;

export async function addPrivateChatMessage(
  roomId: string,
  senderId: string,
  type: PrivateChatMessageType,
  content: string,
  replyToId?: string,
  persistent?: boolean
): Promise<PrivateChatMessage> {
  const client = await ensureInitialized();
  const id = generateId();
  const isPersistent = persistent ? 1 : 0;
  const expiresExpr = persistent
    ? "datetime('9999-12-31')"
    : "datetime('now', '+24 hours')";
  await client.execute({
    sql: `INSERT INTO private_chat_messages (id, room_id, sender_id, type, content, reply_to_id, expires_at, is_persistent)
          VALUES (?, ?, ?, ?, ?, ?, ${expiresExpr}, ?)`,
    args: [id, roomId, senderId, type, content, replyToId || null, isPersistent],
  });
  const row = await client.execute({
    sql: `${MSG_SELECT} WHERE m.id = ?`,
    args: [id],
  });
  return mapMessageRow(row.rows[0] as Record<string, unknown>);
}

export async function editPrivateChatMessage(
  messageId: string,
  senderId: string,
  newContent: string
): Promise<PrivateChatMessage | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `UPDATE private_chat_messages
          SET content = ?, edited_at = datetime('now')
          WHERE id = ? AND sender_id = ? AND type = 'text' AND expires_at > datetime('now')`,
    args: [newContent, messageId, senderId],
  });
  if ((result.rowsAffected ?? 0) === 0) return null;
  const row = await client.execute({
    sql: `${MSG_SELECT} WHERE m.id = ?`,
    args: [messageId],
  });
  if (row.rows.length === 0) return null;
  return mapMessageRow(row.rows[0] as Record<string, unknown>);
}

export async function getPrivateChatMessages(
  roomId: string,
  afterId?: string,
  clearedAt?: string
): Promise<PrivateChatMessage[]> {
  const client = await ensureInitialized();

  let sql: string;
  let args: (string | number)[];
  const clearFilter = clearedAt ? " AND m.created_at > ?" : "";

  if (afterId) {
    sql = `${MSG_SELECT}
           WHERE m.room_id = ?
             AND m.expires_at > datetime('now')${clearFilter}
             AND (
               m.created_at > (SELECT created_at FROM private_chat_messages WHERE id = ?)
               OR (m.edited_at IS NOT NULL AND m.edited_at > (SELECT created_at FROM private_chat_messages WHERE id = ?))
             )
           ORDER BY m.created_at ASC`;
    args = clearedAt ? [roomId, clearedAt, afterId, afterId] : [roomId, afterId, afterId];
  } else {
    sql = `${MSG_SELECT}
           WHERE m.room_id = ?
             AND m.expires_at > datetime('now')${clearFilter}
           ORDER BY m.created_at ASC`;
    args = clearedAt ? [roomId, clearedAt] : [roomId];
  }

  const result = await client.execute({ sql, args });
  return result.rows.map((r) => mapMessageRow(r as Record<string, unknown>));
}

/** Admin link rooms only. Max 2 participants. Returns `full` if a third user tries to join. */
export async function joinPrivateChatRoom(
  roomId: string,
  userId: string
): Promise<"joined" | "already" | "full"> {
  const client = await ensureInitialized();
  const roomRow = await client.execute({
    sql: `SELECT kind FROM private_chat_rooms WHERE id = ? AND is_active = 1`,
    args: [roomId],
  });
  if (roomRow.rows.length === 0) return "full";
  if (parseRoomKind(roomRow.rows[0].kind) !== "admin_link") return "already";

  const existing = await client.execute({
    sql: `SELECT 1 FROM private_chat_participants WHERE room_id = ? AND user_id = ?`,
    args: [roomId, userId],
  });
  if (existing.rows.length > 0) return "already";

  const countResult = await client.execute({
    sql: `SELECT COUNT(*) as c FROM private_chat_participants WHERE room_id = ?`,
    args: [roomId],
  });
  const count = Number(countResult.rows[0]?.c ?? 0);
  if (count >= 2) return "full";

  await client.execute({
    sql: `INSERT INTO private_chat_participants (room_id, user_id, membership_status) VALUES (?, ?, 'active')`,
    args: [roomId, userId],
  });
  return "joined";
}

export async function updateTypingStatus(
  roomId: string,
  userId: string
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE private_chat_participants SET last_typing_at = datetime('now') WHERE room_id = ? AND user_id = ?`,
    args: [roomId, userId],
  });
}

export async function updateLastSeen(
  roomId: string,
  userId: string,
  lastReadMsgId?: string
): Promise<void> {
  const client = await ensureInitialized();
  if (lastReadMsgId) {
    await client.execute({
      sql: `UPDATE private_chat_participants SET last_seen_at = datetime('now'), last_read_msg_id = ? WHERE room_id = ? AND user_id = ?`,
      args: [lastReadMsgId, roomId, userId],
    });
  } else {
    await client.execute({
      sql: `UPDATE private_chat_participants SET last_seen_at = datetime('now') WHERE room_id = ? AND user_id = ?`,
      args: [roomId, userId],
    });
  }
}

function parseMembershipStatus(val: unknown): PrivateChatMembershipStatus {
  const s = String(val || "active");
  return s === "pending" ? "pending" : "active";
}

export async function getPrivateChatParticipants(
  roomId: string
): Promise<PrivateChatParticipant[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT p.user_id, p.joined_at, p.last_typing_at, p.last_seen_at, p.last_read_msg_id, p.cleared_at, p.membership_status, u.display_name, u.avatar_url
          FROM private_chat_participants p
          JOIN users u ON u.id = p.user_id
          WHERE p.room_id = ?
          ORDER BY p.joined_at ASC`,
    args: [roomId],
  });
  return result.rows.map((r) => ({
    userId: str(r.user_id),
    displayName: str(r.display_name) || str(r.user_id),
    avatarUrl: str(r.avatar_url),
    joinedAt: str(r.joined_at),
    lastTypingAt: str(r.last_typing_at),
    lastSeenAt: str(r.last_seen_at),
    lastReadMsgId: str(r.last_read_msg_id),
    clearedAt: str(r.cleared_at),
    membershipStatus: parseMembershipStatus(r.membership_status),
  }));
}

export interface UserChatRoomSummary {
  id: string;
  label: string;
  createdAt: string;
  lastMessageContent: string;
  lastMessageType: PrivateChatMessageType;
  lastMessageAt: string;
  lastSenderName: string;
  /** Current user's membership in this room */
  myMembership: PrivateChatMembershipStatus;
  participants: { userId: string; displayName: string; avatarUrl: string; lastSeenAt: string }[];
}

export async function clearChatForUser(
  roomId: string,
  userId: string
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `UPDATE private_chat_participants SET cleared_at = datetime('now') WHERE room_id = ? AND user_id = ?`,
    args: [roomId, userId],
  });
}

export async function listUserChatRooms(
  userId: string
): Promise<UserChatRoomSummary[]> {
  const client = await ensureInitialized();

  const roomsResult = await client.execute({
    sql: `SELECT r.id, r.label, r.created_at,
                 p.membership_status AS my_membership,
                 last_msg.content AS last_content,
                 last_msg.type AS last_type,
                 last_msg.created_at AS last_msg_at,
                 last_sender.display_name AS last_sender_name
          FROM private_chat_participants p
          JOIN private_chat_rooms r ON r.id = p.room_id AND r.is_active = 1
          LEFT JOIN private_chat_messages last_msg ON last_msg.id = (
            SELECT id FROM private_chat_messages
            WHERE room_id = r.id AND expires_at > datetime('now')
              AND (p.cleared_at IS NULL OR created_at > p.cleared_at)
            ORDER BY created_at DESC LIMIT 1
          )
          LEFT JOIN users last_sender ON last_sender.id = last_msg.sender_id
          WHERE p.user_id = ?
          ORDER BY COALESCE(last_msg.created_at, r.created_at) DESC`,
    args: [userId],
  });

  if (roomsResult.rows.length === 0) return [];

  const roomIds = roomsResult.rows.map((r) => str(r.id));
  const placeholders = roomIds.map(() => "?").join(",");
  const partResult = await client.execute({
    sql: `SELECT p.room_id, p.user_id, p.last_seen_at, u.display_name, u.avatar_url
          FROM private_chat_participants p
          JOIN users u ON u.id = p.user_id
          WHERE p.room_id IN (${placeholders})
          ORDER BY p.joined_at ASC`,
    args: roomIds,
  });

  const partsByRoom = new Map<string, { userId: string; displayName: string; avatarUrl: string; lastSeenAt: string }[]>();
  for (const r of partResult.rows) {
    const roomId = str(r.room_id);
    if (!partsByRoom.has(roomId)) partsByRoom.set(roomId, []);
    partsByRoom.get(roomId)!.push({
      userId: str(r.user_id),
      displayName: str(r.display_name) || str(r.user_id),
      avatarUrl: str(r.avatar_url),
      lastSeenAt: str(r.last_seen_at),
    });
  }

  return roomsResult.rows.map((r) => ({
    id: str(r.id),
    label: str(r.label),
    createdAt: str(r.created_at),
    lastMessageContent: str(r.last_content),
    lastMessageType: parseMessageType(r.last_type),
    lastMessageAt: str(r.last_msg_at),
    lastSenderName: str(r.last_sender_name),
    myMembership: parseMembershipStatus(r.my_membership),
    participants: partsByRoom.get(str(r.id)) || [],
  }));
}

/** Best-effort delete Vercel Blob objects referenced by expiring audio messages. */
async function deleteAudioBlobsForExpiredMessages(client: Client): Promise<void> {
  const sel = await client.execute({
    sql: `SELECT content FROM private_chat_messages
          WHERE expires_at < datetime('now') AND is_persistent = 0 AND type = 'audio'`,
    args: [],
  });
  let delBlob: ((url: string) => Promise<void>) | null = null;
  for (const row of sel.rows) {
    const raw = str(row.content);
    let url: string | undefined;
    try {
      const parsed = JSON.parse(raw) as { url?: string };
      if (typeof parsed.url === "string") url = parsed.url;
    } catch {
      continue;
    }
    if (!url || !url.startsWith("https://")) continue;
    if (!delBlob) {
      try {
        const { del } = await import("@vercel/blob");
        delBlob = (u: string) => del(u);
      } catch {
        return;
      }
    }
    try {
      await delBlob(url);
    } catch {
      /* ignore per blob */
    }
  }
}

export async function purgeExpiredPrivateChatMessages(): Promise<number> {
  const client = await ensureInitialized();
  await deleteAudioBlobsForExpiredMessages(client);
  const result = await client.execute(
    `DELETE FROM private_chat_messages WHERE expires_at < datetime('now') AND is_persistent = 0`
  );
  return result.rowsAffected ?? 0;
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

export interface ChatReaction {
  emoji: string;
  userIds: string[];
}

export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<"added" | "removed"> {
  const client = await ensureInitialized();
  const existing = await client.execute({
    sql: `SELECT 1 FROM private_chat_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`,
    args: [messageId, userId, emoji],
  });
  if (existing.rows.length > 0) {
    await client.execute({
      sql: `DELETE FROM private_chat_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`,
      args: [messageId, userId, emoji],
    });
    return "removed";
  }
  await client.execute({
    sql: `INSERT INTO private_chat_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)`,
    args: [messageId, userId, emoji],
  });
  return "added";
}

export async function getReactionsForRoom(
  roomId: string
): Promise<Record<string, ChatReaction[]>> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT r.message_id, r.emoji, r.user_id
          FROM private_chat_reactions r
          JOIN private_chat_messages m ON m.id = r.message_id
          WHERE m.room_id = ?
          ORDER BY r.created_at ASC`,
    args: [roomId],
  });

  const byMsg = new Map<string, Map<string, string[]>>();
  for (const row of result.rows) {
    const msgId = str(row.message_id);
    const emoji = str(row.emoji);
    const userId = str(row.user_id);
    if (!byMsg.has(msgId)) byMsg.set(msgId, new Map());
    const emojiMap = byMsg.get(msgId)!;
    if (!emojiMap.has(emoji)) emojiMap.set(emoji, []);
    emojiMap.get(emoji)!.push(userId);
  }

  const out: Record<string, ChatReaction[]> = {};
  for (const [msgId, emojiMap] of byMsg) {
    out[msgId] = Array.from(emojiMap.entries()).map(([emoji, userIds]) => ({ emoji, userIds }));
  }
  return out;
}

export interface FindOrCreateDirectRoomResult {
  roomId: string;
  /** True when the invitee should receive a new-invite notification */
  shouldNotifyInvitee: boolean;
}

export async function getParticipantMembership(
  roomId: string,
  userId: string
): Promise<PrivateChatMembershipStatus | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT membership_status FROM private_chat_participants WHERE room_id = ? AND user_id = ?`,
    args: [roomId, userId],
  });
  if (result.rows.length === 0) return null;
  return parseMembershipStatus(result.rows[0].membership_status);
}

export async function acceptSocialChatInvite(roomId: string, userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const room = await getPrivateChatRoom(roomId);
  if (!room || room.kind !== "social_direct") return false;
  const result = await client.execute({
    sql: `UPDATE private_chat_participants SET membership_status = 'active'
          WHERE room_id = ? AND user_id = ? AND membership_status = 'pending'`,
    args: [roomId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function declineSocialChatInvite(roomId: string, userId: string): Promise<boolean> {
  const client = await ensureInitialized();
  const room = await getPrivateChatRoom(roomId);
  if (!room || room.kind !== "social_direct") return false;
  const result = await client.execute({
    sql: `DELETE FROM private_chat_participants WHERE room_id = ? AND user_id = ? AND membership_status = 'pending'`,
    args: [roomId, userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

/** Remove a participant from an admin link room (creator must match admin). */
export async function removeParticipantFromAdminLinkRoom(
  roomId: string,
  targetUserId: string,
  adminUserId: string
): Promise<boolean> {
  const client = await ensureInitialized();
  const room = await getPrivateChatRoom(roomId);
  if (!room || room.kind !== "admin_link" || room.createdBy !== adminUserId) return false;
  if (targetUserId === adminUserId) return false;
  const result = await client.execute({
    sql: `DELETE FROM private_chat_participants WHERE room_id = ? AND user_id = ?`,
    args: [roomId, targetUserId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function findOrCreateDirectRoom(
  userA: string,
  userB: string
): Promise<FindOrCreateDirectRoomResult> {
  const client = await ensureInitialized();

  const existingPair = await client.execute({
    sql: `SELECT p1.room_id
          FROM private_chat_participants p1
          JOIN private_chat_participants p2 ON p1.room_id = p2.room_id AND p2.user_id = ?
          JOIN private_chat_rooms r ON r.id = p1.room_id
          WHERE p1.user_id = ? AND r.is_active = 1 AND r.kind = 'social_direct'
          LIMIT 1`,
    args: [userB, userA],
  });

  if (existingPair.rows.length > 0) {
    return { roomId: str(existingPair.rows[0].room_id), shouldNotifyInvitee: false };
  }

  const orphan = await client.execute({
    sql: `SELECT r.id
          FROM private_chat_rooms r
          WHERE r.kind = 'social_direct' AND r.is_active = 1 AND r.created_by = ?
            AND (SELECT COUNT(*) FROM private_chat_participants p WHERE p.room_id = r.id) = 1
            AND EXISTS (SELECT 1 FROM private_chat_participants p WHERE p.room_id = r.id AND p.user_id = ?)
          LIMIT 1`,
    args: [userA, userA],
  });

  if (orphan.rows.length > 0) {
    const oid = str(orphan.rows[0].id);
    await client.execute({
      sql: `INSERT INTO private_chat_participants (room_id, user_id, membership_status) VALUES (?, ?, 'pending')`,
      args: [oid, userB],
    });
    return { roomId: oid, shouldNotifyInvitee: true };
  }

  const id = generateId();
  await client.execute({
    sql: "INSERT INTO private_chat_rooms (id, created_by, label, kind) VALUES (?, ?, '', 'social_direct')",
    args: [id, userA],
  });

  await client.execute({
    sql: "INSERT INTO private_chat_participants (room_id, user_id, membership_status) VALUES (?, ?, 'active')",
    args: [id, userA],
  });
  await client.execute({
    sql: "INSERT INTO private_chat_participants (room_id, user_id, membership_status) VALUES (?, ?, 'pending')",
    args: [id, userB],
  });

  return { roomId: id, shouldNotifyInvitee: true };
}
