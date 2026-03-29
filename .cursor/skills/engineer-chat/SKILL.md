---
name: engineer-chat
description: Owns the private chat room system -- real-time messaging between users with polling, typing indicators, presence, read receipts, portfolio sharing cards, and 24h TTL. Use when working on chat UI, chat API routes, chat database layer, message types, chat admin, typing/presence/read-receipt logic, portfolio share cards, or mobile chat UX.
---

# Private Chat Engineer

## Scope

Own all private chat features: room lifecycle, messaging, real-time updates, portfolio sharing, and mobile UX. Does NOT cover the separate AI support chat system (`support_chat_*` tables).

## Architecture

```
Admin creates room (/api/admin/chats POST)
       |
       v
 Room token (= room id) shared via link
       |
       v
 /chat/[token]  -- single room view (standalone page)
 /chats          -- inbox: room list + inline room (desktop split view)
       |
       v
 Polling loop (3s) fetches messages + participants + presence
 Typing heartbeat (2s) posted separately
 Read receipts piggyback on every poll via lastRead param
```

- Rooms are admin-only creation (`requireAdmin`), token-based access (`requireSession`).
- Both `/chat` and `/chats` layouts set `robots: { index: false }` and use `h-dvh fixed inset-0 overflow-hidden` for native-app feel.
- No WebSockets -- all real-time via short-polling.

## File Map

### Pages & UI

| File | Purpose |
|------|---------|
| `src/app/chat/layout.tsx` | Viewport shell, noindex metadata |
| `src/app/chat/[token]/page.tsx` | Server page, `force-dynamic`, renders `ChatRoom` |
| `src/app/chat/[token]/chat-room.tsx` | Thin wrapper, renders `ChatRoomView` with `showBackButton` |
| `src/app/chat/chat-room-view.tsx` | **Core chat UI**: polling, send/edit/reply, typing, presence, read receipts, message bubbles, portfolio cards, image upload/compress, keyboard shortcuts |
| `src/app/chat/share-portfolio-modal.tsx` | Portfolio share modal (dynamic import): fetches holdings/quotes, 4 tabs, privacy levels, persistent toggle |
| `src/app/chats/layout.tsx` | Viewport shell, noindex metadata |
| `src/app/chats/page.tsx` | Renders `ChatListShell` |
| `src/app/chats/chat-list-shell.tsx` | Inbox: polls `/api/chats` every 5s, responsive split (desktop) / full-screen list (mobile) |
| `src/app/chats/chat-list-sidebar.tsx` | Searchable room list with previews, online dots, relative timestamps |

### API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/chat/[token]` | GET | session | Load room, messages, participants; update `lastSeen`/`lastRead` |
| `/api/chat/[token]/messages` | POST | session | Send message (text/link/image/portfolio cards); `persistent` flag |
| `/api/chat/[token]/messages` | PATCH | session | Edit own message (`messageId` + `content`) |
| `/api/chat/[token]/typing` | POST | session | Update typing timestamp; returns 204 |
| `/api/chats` | GET | session | List all rooms the user participates in |
| `/api/admin/chats` | GET | admin | List rooms created by admin |
| `/api/admin/chats` | POST | admin | Create room (optional `label`); returns room + URL |
| `/api/admin/chats/[id]` | DELETE | admin | Deactivate room |

### Data Layer

| File | Purpose |
|------|---------|
| `src/lib/db/private-chat.ts` | All chat DAL functions and types |
| `src/lib/db/index.ts` | Re-exports all chat types and functions |
| `src/lib/db/migrations.ts` | Schema (v83-v87) |

### Admin UI

| File | Purpose |
|------|---------|
| `src/app/(app)/admin/tabs/PrivateChatsTab.tsx` | Create/list/deactivate rooms, copy share link |

## Database Schema (migrations v83-v87)

### Tables

**`private_chat_rooms`**
- `id TEXT PRIMARY KEY` (token used in URLs)
- `created_by TEXT NOT NULL REFERENCES users(id)`
- `label TEXT NOT NULL DEFAULT ''`
- `is_active INTEGER NOT NULL DEFAULT 1`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`

**`private_chat_messages`**
- `id TEXT PRIMARY KEY`
- `room_id TEXT NOT NULL REFERENCES private_chat_rooms(id) ON DELETE CASCADE`
- `sender_id TEXT NOT NULL`
- `type TEXT NOT NULL DEFAULT 'text'`
- `content TEXT NOT NULL`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `expires_at TEXT NOT NULL`
- `reply_to_id TEXT` (v85)
- `edited_at TEXT` (v85)
- `is_persistent INTEGER NOT NULL DEFAULT 0` (v87)
- Indexes: `idx_pcm_room_created`, `idx_pcm_expires`

**`private_chat_participants`**
- Composite PK `(room_id, user_id)`
- `joined_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `last_typing_at TEXT` (v85)
- `last_seen_at TEXT` (v86)
- `last_read_msg_id TEXT` (v86)

### Migration conventions

- Guard `ALTER TABLE` with `PRAGMA table_info` + column-name check (idempotent).
- Use `CREATE TABLE IF NOT EXISTS` for new tables.
- Append to the `MIGRATIONS` array with the next sequential version number.

## Data Access Functions

All in `src/lib/db/private-chat.ts`, re-exported from `src/lib/db/index.ts`.

| Function | Signature | Notes |
|----------|-----------|-------|
| `createPrivateChatRoom` | `(createdBy, label) => PrivateChatRoom` | Admin only |
| `getPrivateChatRoom` | `(id) => PrivateChatRoom \| null` | Active rooms only |
| `deactivatePrivateChatRoom` | `(id) => boolean` | Soft delete |
| `listPrivateChatRooms` | `(adminUserId) => PrivateChatRoomListItem[]` | With message counts |
| `addPrivateChatMessage` | `(roomId, senderId, type, content, replyToId?, persistent?) => PrivateChatMessage` | TTL = 24h unless `persistent` (expires 9999-12-31) |
| `editPrivateChatMessage` | `(messageId, senderId, newContent) => PrivateChatMessage \| null` | Only own, non-expired |
| `getPrivateChatMessages` | `(roomId, afterId?) => PrivateChatMessage[]` | Cursor supports new + edited messages |
| `joinPrivateChatRoom` | `(roomId, userId) => void` | `INSERT OR IGNORE` |
| `updateTypingStatus` | `(roomId, userId) => void` | |
| `updateLastSeen` | `(roomId, userId, lastReadMsgId?) => void` | Updates presence + read pointer |
| `getPrivateChatParticipants` | `(roomId) => PrivateChatParticipant[]` | Joined with `users` for display name/avatar |
| `listUserChatRooms` | `(userId) => UserChatRoomSummary[]` | Inbox: rooms + last message + participants |
| `purgeExpiredPrivateChatMessages` | `() => number` | Deletes where `expires_at < now AND is_persistent = 0` |

### Types

- `PrivateChatMessageType`: `"text" | "link" | "image" | "holding" | "allocation" | "summary" | "stock_pick"`
- `PrivateChatRoom`, `PrivateChatMessage`, `PrivateChatParticipant`, `PrivateChatRoomListItem`, `UserChatRoomSummary`

## Message Types

| Type | Content format | Notes |
|------|---------------|-------|
| `text` | Plain string | Multiline, whitespace-pre-wrap |
| `link` | URL string | Auto-detected via `isUrl()` or explicit |
| `image` | Base64 data URL | Client compresses to max 1920px, JPEG 80%, 3.5MB limit |
| `holding` | JSON (`HoldingCardData`) | Privacy: `full`, `anonymous`, `ticker_only` |
| `allocation` | JSON (`AllocationCardData`) | Privacy: `full`, `percentages`, `categories` |
| `summary` | JSON (`SummaryCardData`) | Privacy: `full`, `percentages`, `count_only` |
| `stock_pick` | JSON (`StockPickCardData`) | Ticker + optional note |

Portfolio card types are rendered by `PortfolioCardRenderer` in `chat-room-view.tsx`. Card type interfaces are defined inline in the same file.

## Real-Time Patterns

### Polling (3s interval)

```
GET /api/chat/[token]?after={lastMsgId}&lastRead={lastMsgId}
```

- `after` cursor returns only new + recently edited messages.
- `lastRead` piggybacks read-receipt updates.
- Response always includes full `participants` array (with `lastSeenAt`, `lastReadMsgId`).
- After initial load, a fire-and-forget fetch sends `lastRead` immediately.

### Typing (2s heartbeat)

- Client calls `POST /api/chat/[token]/typing` at most every 2s while user types.
- Participants whose `lastTypingAt` is within 4s are shown as typing.
- A 1s tick timer re-evaluates typing state continuously.

### Presence (15s threshold)

- `lastSeenAt` updated on every poll via `updateLastSeen`.
- `ONLINE_THRESHOLD_MS = 15000` -- green dot if within threshold.
- Header shows "Online" / "Last seen Xm ago" for the other participant.
- Exported: `isParticipantOnline(lastSeenAt)` for reuse in chat list sidebar.

### Read Receipts

- Each poll sends `lastRead` = last message ID the client has seen.
- Server stores it in `private_chat_participants.last_read_msg_id`.
- Client computes `isMessageRead(msgId)` by comparing message position against each other participant's read pointer.
- Own messages show `CheckCheck` icon: blue if read, gray if delivered.
- Both last-in-group (with timestamp) and mid-group (small, right-aligned) positions.

## TTL & Persistence

- Default: messages expire 24 hours after creation (`expires_at = datetime('now', '+24 hours')`).
- Persistent: `is_persistent = 1`, `expires_at = datetime('9999-12-31')`.
- Client-side filter runs every 60s to remove expired messages (skips persistent).
- Server purge: `purgeExpiredPrivateChatMessages()` in daily cron (`/api/cron/push-gauges`, `0 0 * * *` UTC). Only deletes `is_persistent = 0`.
- Persistent messages show a `Pin` icon instead of the TTL countdown.

## Image Handling

1. User selects file (upload button) or captures (camera button, mobile only via `capture="environment"`).
2. Client `compressImage()`: resize to max 1920px dimension, JPEG 80% quality.
3. If compressed base64 > 3.5MB, reject with error.
4. Server validates: `Math.ceil((content.length * 3) / 4) <= 3.5MB`.
5. Paste from clipboard also supported via `onPaste` handler.

## Portfolio Sharing Flow

1. User clicks `Share2` button in input area.
2. `SharePortfolioModal` opens (dynamic import, SSR disabled).
3. Modal fetches `/api/holdings`, `/api/cash`, `/api/exchange-rates`, `/api/quote`.
4. User picks tab (holding/allocation/summary/stock_pick), selects privacy, toggles persistent.
5. `buildPayload()` creates JSON content, calls `onSend(type, content, persistent)`.
6. `sendCardMessage` in `chat-room-view` POSTs to `/api/chat/[token]/messages` with the card type and persistent flag.
7. `MessageBubble` renders via `PortfolioCardRenderer` which dispatches to `HoldingCard`, `AllocationCard`, `SummaryCard`, `StockPickCard`.

## UX Rules

### Mobile-Native Feel

- Layouts: `h-dvh bg-gray-50 dark:bg-slate-950 overflow-hidden fixed inset-0`.
- Chat room outer div: `overscrollBehavior: "none"`.
- Messages area: `overscroll-none`.
- Input padding respects safe area: `paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))"`.

### Responsive Split View (`/chats`)

- Desktop (md+): sidebar list + inline `ChatRoomView` side by side.
- Mobile: full-screen list; `onSelect` navigates to `/chat/[token]` (standalone).
- `isMobile` detected via `window.matchMedia`.

### Message Grouping & Colors

- Consecutive messages from same sender are grouped (reduced spacing, rounded corners change).
- 8-color palette in `USER_COLORS` array, assigned via `userColorIndex(userId)` hash.
- Own messages: indigo-600 background, right-aligned.
- Other messages: sender-specific color from palette, left-aligned.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Option+Enter` (Alt+Enter) | Send message |
| `Enter` | New line (default textarea behavior) |
| `Cmd+Up` / `Ctrl+Up` | Edit last own text message (on empty input) |

### Input

- `<textarea>` with auto-resize (max 120px height).
- Reply bar and edit bar shown above input when active.
- Cancel via `X` button clears reply/edit state.

## Adding a New Message Type

1. Add the type string to `PrivateChatMessageType` union in `src/lib/db/private-chat.ts`.
2. Add it to `VALID_MSG_TYPES` set in the same file.
3. Add it to `VALID_TYPES` set in `src/app/api/chat/[token]/messages/route.ts`.
4. Add the type to `ChatMessageType` union in `chat-room-view.tsx`.
5. Create a card interface and renderer component in `chat-room-view.tsx`.
6. Add a `case` in `PortfolioCardRenderer` switch.
7. Add the type to `CARD_TYPES` set (if it renders as a card, not inline text).
8. Update reply preview text in `MessageBubble` to handle the new type.
9. Update `chat-list-sidebar.tsx` preview logic for the inbox display.

## Adding a New Participant Field

1. Add migration with `ALTER TABLE private_chat_participants ADD COLUMN` (guarded by `PRAGMA table_info`).
2. Update `PrivateChatParticipant` interface in `private-chat.ts`.
3. Add the column to the `SELECT` in `getPrivateChatParticipants`.
4. Map it in the return object with `str()`.
5. Update `Participant` interface in `chat-room-view.tsx`.
6. If needed in chat list, also update `listUserChatRooms` and `ChatRoomSummary` in `chat-list-sidebar.tsx`.

## Quality Gates

1. **TypeScript**: `npx tsc --noEmit` must pass.
2. **Build**: `npm run build` must succeed.
3. **Chat list sync**: if `ChatMessage` type changes, ensure `chat-list-sidebar.tsx` `ChatRoomSummary` stays compatible.
4. **Mobile test**: verify `/chat/[token]` on mobile viewport -- no body scroll, no overscroll bounce.
5. **Both themes**: check card renderers in both light and dark mode.
