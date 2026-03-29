import { ensureInitialized } from "./client";
import { str } from "./helpers";
import { generateId } from "@/lib/utils";

export type PrivateChatMessageType = "text" | "link" | "image" | "holding" | "allocation" | "summary" | "stock_pick";

export interface PrivateChatRoom {
  id: string;
  createdBy: string;
  label: string;
  isActive: boolean;
  createdAt: string;
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
}

export interface PrivateChatRoomListItem extends PrivateChatRoom {
  messageCount: number;
}

const VALID_MSG_TYPES = new Set<PrivateChatMessageType>(["text", "link", "image", "holding", "allocation", "summary", "stock_pick"]);

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

export async function createPrivateChatRoom(
  createdBy: string,
  label: string
): Promise<PrivateChatRoom> {
  const client = await ensureInitialized();
  const id = generateId();
  await client.execute({
    sql: `INSERT INTO private_chat_rooms (id, created_by, label) VALUES (?, ?, ?)`,
    args: [id, createdBy, label],
  });
  return { id, createdBy, label, isActive: true, createdAt: new Date().toISOString() };
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
          WHERE id = ? AND sender_id = ? AND expires_at > datetime('now')`,
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
  afterId?: string
): Promise<PrivateChatMessage[]> {
  const client = await ensureInitialized();

  let sql: string;
  let args: (string | number)[];

  if (afterId) {
    // Fetch messages created after the cursor OR edited after the cursor's created_at
    sql = `${MSG_SELECT}
           WHERE m.room_id = ?
             AND m.expires_at > datetime('now')
             AND (
               m.created_at > (SELECT created_at FROM private_chat_messages WHERE id = ?)
               OR (m.edited_at IS NOT NULL AND m.edited_at > (SELECT created_at FROM private_chat_messages WHERE id = ?))
             )
           ORDER BY m.created_at ASC`;
    args = [roomId, afterId, afterId];
  } else {
    sql = `${MSG_SELECT}
           WHERE m.room_id = ?
             AND m.expires_at > datetime('now')
           ORDER BY m.created_at ASC`;
    args = [roomId];
  }

  const result = await client.execute({ sql, args });
  return result.rows.map((r) => mapMessageRow(r as Record<string, unknown>));
}

export async function joinPrivateChatRoom(
  roomId: string,
  userId: string
): Promise<void> {
  const client = await ensureInitialized();
  await client.execute({
    sql: `INSERT OR IGNORE INTO private_chat_participants (room_id, user_id) VALUES (?, ?)`,
    args: [roomId, userId],
  });
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

export async function getPrivateChatParticipants(
  roomId: string
): Promise<PrivateChatParticipant[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT p.user_id, p.joined_at, p.last_typing_at, p.last_seen_at, p.last_read_msg_id, u.display_name, u.avatar_url
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
  participants: { userId: string; displayName: string; avatarUrl: string; lastSeenAt: string }[];
}

export async function listUserChatRooms(
  userId: string
): Promise<UserChatRoomSummary[]> {
  const client = await ensureInitialized();

  const roomsResult = await client.execute({
    sql: `SELECT r.id, r.label, r.created_at,
                 last_msg.content AS last_content,
                 last_msg.type AS last_type,
                 last_msg.created_at AS last_msg_at,
                 last_sender.display_name AS last_sender_name
          FROM private_chat_participants p
          JOIN private_chat_rooms r ON r.id = p.room_id AND r.is_active = 1
          LEFT JOIN private_chat_messages last_msg ON last_msg.id = (
            SELECT id FROM private_chat_messages
            WHERE room_id = r.id AND expires_at > datetime('now')
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
    participants: partsByRoom.get(str(r.id)) || [],
  }));
}

export async function purgeExpiredPrivateChatMessages(): Promise<number> {
  const client = await ensureInitialized();
  const result = await client.execute(
    `DELETE FROM private_chat_messages WHERE expires_at < datetime('now') AND is_persistent = 0`
  );
  return result.rowsAffected ?? 0;
}
