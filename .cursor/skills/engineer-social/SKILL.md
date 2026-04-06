---
name: engineer-social
description: Owns the social networking layer -- public profiles, rich-content posts, user connections, people search, network feed, and the messaging bridge to private chat. Use when working on social profiles, social posts, connections, feed, search, /u/ public pages, /network pages, social API routes, or social components.
---

# Social Network Engineer

## Scope

Own all social features: public profiles, posts, connections, people search, feed, and the messaging bridge to existing private chat. Does NOT own private chat internals (see `engineer-chat`), but owns `findOrCreateDirectRoom()`.

## Architecture

```
(app)/u/[slug]             -- Public profile page (inside app layout, no auth required)
(app)/u/[slug]/posts/[id]  -- Post detail page (inside app layout, no auth required, respects visibility)
(app)/network              -- Feed hub (auth required)
(app)/network/search       -- People search (auth required)
(app)/network/compose      -- Post composer (auth required)
(app)/network/connections  -- Manage connections (auth required)
(app)/network/conversations -- In-app chat (auth required, mobile: list→detail pattern)
/profile                   -- Social tab in existing profile settings
```

## File Map

### Pages & UI

| File | Purpose |
|------|---------|
| `src/app/(app)/u/[slug]/page.tsx` | Public profile: cover, avatar, bio, portfolio section, posts |
| `src/app/(app)/u/[slug]/layout.tsx` | SEO metadata for profiles |
| `src/app/(app)/u/[slug]/posts/[id]/page.tsx` | Post detail (Substack-style reader) + comments |
| `src/app/(app)/network/page.tsx` | Network feed: sidebar + mobile nav + post cards |
| `src/app/(app)/network/layout.tsx` | Network section layout |
| `src/app/(app)/network/search/page.tsx` | People search with filters |
| `src/app/(app)/network/compose/page.tsx` | Post composer |
| `src/app/(app)/network/connections/page.tsx` | Connection management (3 tabs) |
| `src/app/(app)/network/conversations/page.tsx` | In-app chat (list→detail on mobile, split view on desktop) |

### API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/social/profile` | GET | session | Get own social profile |
| `/api/social/profile` | PUT | session | Update own social profile (slug, bio, headline, visibility, sharing toggles) |
| `/api/social/profile/[slug]` | GET | public | Get public profile by slug |
| `/api/social/posts` | GET | mixed | List posts (for feed or profile) |
| `/api/social/posts` | POST | session | Create new post |
| `/api/social/posts/[id]` | GET | mixed | Get single post (respects visibility) |
| `/api/social/posts/[id]` | PUT | session | Update own post |
| `/api/social/posts/[id]` | DELETE | session | Delete own post |
| `/api/social/posts/images` | POST | session | Upload image to Vercel Blob |
| `/api/social/connections` | GET | session | List connections (my, pending, sent) |
| `/api/social/connections` | POST | session | Send connection request |
| `/api/social/connections/[id]` | PUT | session | Accept/reject connection |
| `/api/social/connections/[id]` | DELETE | session | Remove/withdraw connection |
| `/api/social/connections/[id]/message` | POST | session | Get/create DM room with connected user |
| `/api/social/search` | GET | session | Search people |
| `/api/social/feed` | GET | session | Get personalized feed |
| `/api/social/profile/[slug]/portfolio` | GET | public | Public portfolio summary (respects sharing toggles) |

### Data Layer

| File | Purpose |
|------|---------|
| `src/lib/db/social-profiles.ts` | Profile CRUD, slug validation, public profile query with portfolio data |
| `src/lib/db/social-posts.ts` | Posts CRUD, feed queries, draft management |
| `src/lib/db/social-connections.ts` | Connections CRUD, state machine, cooldown logic |
| `src/lib/db/index.ts` | Re-exports all social types and functions |

### Components

| File | Purpose |
|------|---------|
| `src/components/social/PostCard.tsx` | Post preview card for feed and profile |
| `src/components/social/PostEditor.tsx` | TipTap rich text editor wrapper |
| `src/components/social/ConnectionButton.tsx` | Connect/Pending/Connected/Message state button |
| `src/components/social/ProfileHeader.tsx` | Profile header (cover + avatar + info + actions) |
| `src/components/social/ProfilePortfolioCard.tsx` | Portfolio value card with range selector + chart |
| `src/components/social/ProfileHoldingsCard.tsx` | Holdings composition with donut + 3 views |
| `src/components/social/PeopleSearchBox.tsx` | Search input + filter chips + results |
| `src/components/social/ExperienceBadge.tsx` | Experience level colored badge |
| `src/components/social/VisibilityBadge.tsx` | Post visibility indicator |
| `src/components/social/NetworkSidebar.tsx` | Left sidebar on /network (desktop) + `NetworkMobileNav` (mobile pill bar) |
| `src/components/social/FinancialDisclaimer.tsx` | Auto-generated disclaimer for ticker mentions |

## Database Schema

### Extended `users` columns (migration v92)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `profile_slug` | TEXT | `''` | Unique vanity URL (e.g. `carlos-suarez`), separate from `username` |
| `bio` | TEXT | `''` | Free-text biography, max 500 chars |
| `social_visibility` | TEXT | `'private'` | `'public'` or `'private'` |
| `headline` | TEXT | `''` | Short tagline |
| `share_portfolio_value` | INTEGER | `0` | Opt-in to show portfolio value card on public profile |
| `share_holdings` | INTEGER | `0` | Opt-in to show holdings composition card |

Unique index: `idx_users_profile_slug ON users(profile_slug) WHERE profile_slug != ''`

### `user_connections` (migration v93)

| Column | Type | Constraint |
|--------|------|------------|
| `id` | TEXT | PRIMARY KEY |
| `requester_id` | TEXT | NOT NULL REFERENCES users(id) |
| `receiver_id` | TEXT | NOT NULL REFERENCES users(id) |
| `status` | TEXT | `'pending'`, CHECK IN ('pending','accepted','rejected','blocked') |
| `created_at` | TEXT | DEFAULT datetime('now') |
| `updated_at` | TEXT | DEFAULT datetime('now') |

UNIQUE(requester_id, receiver_id). Indexes on (receiver_id, status) and (requester_id, status).

### `social_posts` (migration v94)

| Column | Type | Constraint |
|--------|------|------------|
| `id` | TEXT | PRIMARY KEY |
| `user_id` | TEXT | NOT NULL REFERENCES users(id) |
| `title` | TEXT | DEFAULT '' |
| `content` | TEXT | NOT NULL |
| `content_format` | TEXT | DEFAULT 'html', CHECK IN ('markdown','html') |
| `visibility` | TEXT | DEFAULT 'public', CHECK IN ('public','network','private') |
| `post_type` | TEXT | DEFAULT 'article', CHECK IN ('article','analysis','trade_idea','portfolio_update','link') |
| `link_url` | TEXT | DEFAULT '' |
| `link_title` | TEXT | DEFAULT '' |
| `link_image` | TEXT | DEFAULT '' |
| `is_draft` | INTEGER | DEFAULT 0 |
| `published_at` | TEXT | nullable |
| `created_at` | TEXT | DEFAULT datetime('now') |
| `updated_at` | TEXT | DEFAULT datetime('now') |

Indexes: (user_id, published_at), (visibility, published_at).

### `social_post_images` (migration v95)

Standard image attachment table with `post_id` FK (CASCADE delete), `url`, `alt_text`, `sort_order`.

## Connection State Machine

```
No Relation --[Connect]--> Pending --[Accept]--> Connected --[Remove]--> No Relation
                              |
                              +--[Decline]--> Rejected (7-day cooldown before re-request)
                              +--[Withdraw]--> No Relation
No Relation --[Block]--> Blocked --[Unblock]--> No Relation
```

Rules:
- A user cannot connect with themselves.
- Duplicate requests are rejected (UNIQUE constraint on requester_id, receiver_id).
- Bidirectional lookup: check both (A,B) and (B,A) when querying relationship status.
- Rejected requests enforce a 7-day cooldown (`updated_at + 7 days`).
- Blocked users cannot send requests; blocked user's existing pending requests are auto-rejected.

## Post Visibility Model

| Visibility | Who can see |
|------------|-------------|
| `public` | Anyone (including unauthenticated visitors) |
| `network` | Author + connected users only |
| `private` | Author only |

Viewer resolution algorithm (used by all post endpoints):
1. If viewer is author: show all posts including drafts.
2. If viewer is connected to author: show `public` + `network` posts.
3. If viewer is authenticated but not connected: show `public` posts only.
4. If viewer is unauthenticated: show `public` posts only.
5. If author's `social_visibility = 'private'` and viewer is not connected: show nothing.

## Portfolio Sharing Privacy Model

Two independent toggles on the user profile:

| Toggle | What it shows | What it hides |
|--------|---------------|---------------|
| `share_portfolio_value` | Total portfolio value, invested amount, total gain/loss (% + absolute), chart | Exact share counts, individual position sizes |
| `share_holdings` | Ticker names, allocation %, category breakdown (by type/sector), donut chart | Exact share counts, cost basis per position |

Both cards show a note explaining why they're visible: "Visible because the owner enabled portfolio sharing in Social Settings."

## TipTap Editor Configuration

Dependencies: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`, `@tiptap/extension-underline`

Extensions: StarterKit (headings H1/H2, bold, italic, lists, blockquote, code), Underline, Link (openOnClick: false), Image, Placeholder.

Images are uploaded to Vercel Blob via `POST /api/social/posts/images`, which returns `{ url }`. The editor inserts the Blob URL.

## Feed Algorithm (v1)

Simple reverse-chronological feed:
1. Own published (non-draft) posts.
2. Published posts from connected users where visibility is `public` or `network`.
3. Ordered by `published_at DESC`.
4. Cursor-based pagination using `published_at` + `id`.

## Messaging Bridge

`findOrCreateDirectRoom(userA, userB)` in `src/lib/db/private-chat.ts`:
1. Query `private_chat_participants` for rooms where both userA and userB are participants and the room has exactly 2 participants.
2. If found, return the room token.
3. If not, create a new `private_chat_room` (with userA as creator, empty label), add both as participants, return the room token.

Requires an accepted connection between the two users (checked in the API route).

## Adding a New Post Type

1. Add the type string to the `CHECK` constraint migration (new ALTER or new table version).
2. Add it to `PostType` union in `social-posts.ts`.
3. Add it to `VALID_POST_TYPES` set.
4. Add a chip in the post composer `type-selector`.
5. Add a badge color mapping in `PostCard.tsx`.
6. Add a filter tab in the profile post tabs.

## Adding a New Profile Field

1. Add migration with `ALTER TABLE users ADD COLUMN` (guarded by `PRAGMA table_info`).
2. Update `DbUser` interface in `helpers.ts`.
3. Update `rowToDbUser` in `helpers.ts`.
4. Add to the social profile GET/PUT API routes.
5. Add the field to the Social tab in `ProfilePage.tsx`.
6. Update the public profile display in `src/app/u/[slug]/page.tsx`.

## Adding a New Connection Action

1. Add the status to the `CHECK` constraint (may need migration).
2. Add transition logic in `social-connections.ts`.
3. Add API handler in `connections/[id]/route.ts`.
4. Update `ConnectionButton.tsx` to handle the new state.
5. Update the connections page tabs if needed.

## Analytics Events

| Event | Type | Metadata |
|-------|------|----------|
| `profile_view` | server | `{ slug, viewerId?, isOwner }` |
| `profile_edit` | server | `{ fields[] }` |
| `post_publish` | server | `{ postId, postType, visibility }` |
| `post_view` | server | `{ postId, slug }` |
| `connection_request` | server | `{ targetUserId }` |
| `connection_accept` | server | `{ connectionId }` |
| `connection_reject` | server | `{ connectionId }` |
| `people_search` | client | `{ query, filters }` |
| `feed_view` | client | `{ postCount }` |

## Quality Gates

1. **TypeScript**: `npx tsc --noEmit` must pass.
2. **Build**: `npm run build` must succeed.
3. **Unit tests**: `npx vitest run` -- all social tests pass, >= 80% coverage on social files.
4. **E2E tests**: `npx playwright test e2e/social-*.spec.ts` -- all pass.
5. **Theme parity**: verify all social pages in Default, Canvas, Terminal, Studio themes.
6. **Responsive**: verify at 375px (mobile), 768px (tablet), 1280px (desktop).
7. **Privacy**: verify portfolio cards respect opt-in toggles; share counts never exposed.
