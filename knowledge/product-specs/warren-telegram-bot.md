# Warren on Telegram

> Conversational access to Warren — and to the user's full portfolio — from a Telegram chat.

## 1. Summary

The Warren AI portfolio assistant is also reachable as a Telegram bot. After the
user links their trefolio account from `/profile`, they can chat with Warren in
plain language — by typing OR by sending a voice note — from their phone or
desktop Telegram client. The bot has the same capabilities as the in-app
Warren drawer: read holdings, allocation, performance, dividends, news,
alerts, watchlist, plus write actions (`addHolding`, `removeHolding`,
`addCash`, `createAlert`, `addWatchlist`) gated behind a Telegram inline-
keyboard Confirm/Cancel. Voice notes are transcribed by OpenAI Whisper and
the reply is also spoken back via OpenAI TTS (text always sent first).

## 2. Status

- **Tier:** Free / Pro (uses the `ai_consult` quota — 15/month free, 500/month pro).
- **Feature flag:** `telegram_bot_enabled` (platform-level, default ON).
- **Health:** new (yellow until first cohort lands).
- **Owning skill:** [`.cursor/skills/engineer-integrations/SKILL.md`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Webhook | [`src/app/api/webhooks/telegram/[secret]/route.ts`](../../src/app/api/webhooks/telegram/[secret]/route.ts) | Receives Bot API updates. Path + header secret verified. |
| API | [`src/app/api/integrations/telegram/link/route.ts`](../../src/app/api/integrations/telegram/link/route.ts) | `POST` generates token, `GET` returns status, `DELETE` unlinks. |
| Component | [`src/components/profile/TelegramConnectCard.tsx`](../../src/components/profile/TelegramConnectCard.tsx) | Connect / disconnect card on `/profile`. |
| Server module | [`src/lib/telegram/handler.ts`](../../src/lib/telegram/handler.ts) | Update routing: commands, free-form text, voice notes, callback queries. |
| Server module | [`src/lib/telegram/client.ts`](../../src/lib/telegram/client.ts) | HTTPS wrapper around the Bot API (sendMessage, sendPhoto, sendVoice, getFile, downloadFile). |
| Server module | [`src/lib/telegram/format.ts`](../../src/lib/telegram/format.ts) | MarkdownV2 escaping, Warren-card rendering, message splitting, plain-text stripping for TTS. |
| Server module | [`src/lib/telegram/i18n.ts`](../../src/lib/telegram/i18n.ts) | EN + ES copy bundles for handler scaffolding (incl. voice errors and disclaimers). |
| Server module | [`src/lib/ai/transcribe.ts`](../../src/lib/ai/transcribe.ts) | OpenAI Whisper wrapper for voice-note speech-to-text. |
| Server module | [`src/lib/ai/tts.ts`](../../src/lib/ai/tts.ts) | OpenAI TTS wrapper that returns OGG/Opus for `sendVoice`. |
| Script | [`scripts/telegram-set-webhook.ts`](../../scripts/telegram-set-webhook.ts) | One-shot `setWebhook` + `setMyCommands`. |
| Script | [`scripts/export-warren-avatar.ts`](../../scripts/export-warren-avatar.ts) | Render `warren.svg` to a 512×512 PNG for BotFather `/setuserpic`. |

## 4. Data model

Tables added in migration **v110** (see [`src/lib/db/migrations.ts`](../../src/lib/db/migrations.ts)):

- `telegram_link_tokens(token, user_id, created_at, expires_at)` — one-time deep-link tokens, TTL 15 min.
- `telegram_chats(chat_id, user_id, language_code, linked_at, last_seen_at, last_active_portfolio_id)` — permanent link.
- `telegram_proposals(id, chat_id, user_id, kind, data_json, summary, expires_at, status)` — pending Confirm/Cancel cards.
- `telegram_messages(id, chat_id, role, content, created_at)` — rolling history (latest 20 per chat).

Types and helpers in [`src/lib/db/telegram.ts`](../../src/lib/db/telegram.ts).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/webhooks/telegram/<secret>` | path + header secret | n/a | Receives Telegram `Update` JSON. |
| POST | `/api/integrations/telegram/link` | session | Free+ | Generate a one-time deep-link token. |
| GET | `/api/integrations/telegram/link` | session | Free+ | Current link state for the signed-in user. |
| DELETE | `/api/integrations/telegram/link` | session | Free+ | Unlink chat (wipes proposals + history). |

## 6. UI surface

- `/profile` → **Warren on Telegram** card with Connect / Disconnect button and deep link.
- Telegram bot itself: `/help`, `/menu`, `/portfolios`, `/holdings`, `/chart`, `/news`, `/growth`, `/dividends`, `/alerts`, `/watchlist`, `/lang <code>`, `/unlink`.
- Free-form text → Warren AI turn.
- Voice notes → transcribed by Whisper, fed into the same Warren turn, reply
  is sent as text first and then spoken back via TTS as a Telegram voice
  bubble. Caps: 60 seconds and 4 MB. Echoes the transcript so the user
  can spot misrecognitions.

## 7. Business logic

The Telegram handler reuses three core building blocks so feature parity with
the web Warren drawer is maintained:

1. [`buildPortfolioSnapshot`](../../src/lib/ai/warren/build-snapshot.ts) — server-side equivalent of the snapshot that the web drawer builds from `PortfolioContext`.
2. [`runWarrenTurn`](../../src/lib/ai/warren/run-turn.ts) — runs `streamText` with the full Warren tool kit (`buildWarrenTools`) and the channel-aware system prompt (`channel: "telegram"`).
3. [`dispatchProposal`](../../src/lib/ai/warren/dispatch.ts) — same write-path used by the web `/api/warren/confirm` route. Plan limits are enforced inside.

Price-move questions ("por qué bajó X?", "why did Uber drop?") share the same
path: [`buildPriceMovePrefetchAppendix`](../../src/lib/ai/warren/price-move-intent.ts)
resolves fuzzy company names to portfolio venue tickers (e.g. Sarabi → SRB.L),
surfaces calendar earnings for today/this week, and the turn must call
`getQuote` + `getTickerNews` + `getMarketCatalysts`. Quotes with price ≤ 0 are
returned as errors so Warren never narrates "USD 0".

Web `/api/warren/chat` is unchanged in behavior; it now delegates to the same
`runWarrenTurn` core.

### Prompt-injection mitigations (web Warren + legacy Portfolio AI)

- [`/api/warren/chat`](../../src/app/api/warren/chat/route.ts) validates `activePortfolioId` against `listPortfolios(session.userId)`, ignores client-supplied portfolio display names (uses the database name through [`sanitizeWarrenPortfolioLabel`](../../src/lib/ai/prompt-safety.ts)), and parses `portfolioContext` with [`warrenPortfolioSnapshotSchema`](../../src/lib/ai/warren/portfolio-snapshot-zod.ts) (strict — unknown keys rejected).
- [`/api/portfolio/ai-chat`](../../src/app/api/portfolio/ai-chat/route.ts) builds the portfolio JSON snapshot **only on the server** via [`buildPortfolioSnapshot`](../../src/lib/ai/warren/build-snapshot.ts) with `enrichForPortfolioAi: true`. The POST body accepts `includePortfolioData`, `activePortfolioId`, and `baseCurrency` instead of raw `portfolioContext`. Stealth mode sends `includePortfolioData: false`.

## 8. External dependencies

- Telegram Bot API (HTTPS — no SDK).
- OpenAI (via the Vercel AI SDK), same `portfolio_chat` flow as web Warren.
- OpenAI `audio/transcriptions` (Whisper) for voice → text.
- OpenAI `audio/speech` (TTS, OGG/Opus) for text → voice replies.

Env vars (server-only):

- `TELEGRAM_BOT_TOKEN` — from [@BotFather](https://t.me/BotFather).
- `TELEGRAM_BOT_USERNAME` — username without the `@`.
- `TELEGRAM_WEBHOOK_SECRET` — random hex; appears in the URL path AND in the `X-Telegram-Bot-Api-Secret-Token` header.
- `PUBLIC_BASE_URL` (script-only) — used by `scripts/telegram-set-webhook.ts`.
- `OPENAI_TRANSCRIPTION_MODEL` (optional) — default `whisper-1`.
- `OPENAI_TTS_MODEL` (optional) — default `gpt-4o-mini-tts`.
- `OPENAI_TTS_VOICE` (optional) — default `alloy`.

Quota:

- `ai_consult` (free 15/mo, pro 500/mo) — same counter as web Warren.

## 9. Currency / FX / tax implications

No changes — money is still stored in EUR base currency. The snapshot is built
server-side using the same `calculatePortfolioTotals` / `computeAllocationByType`
helpers as the web drawer.

## 10. i18n

- AI replies in the user's preferred language (from `user_settings.language` after linking, or Telegram `from.language_code` before).
- Bot scaffolding (button labels, /help text, error toasts) in EN + ES via [`src/lib/telegram/i18n.ts`](../../src/lib/telegram/i18n.ts). Other languages fall back to English for now.
- BotFather `setMyCommands` is registered for both `en` and `es`.

## 11. Permissions / tier gating / rate limits

- `requireFeatureQuotaByUserId(userId, "ai_consult")` (new helper in [`src/lib/auth/guards.ts`](../../src/lib/auth/guards.ts)) — same monthly cap as web Warren.
- `dispatchProposal` enforces `getHoldingsLimit`, `getAlertLimit`, `alerts_enabled`.
- `telegram_bot_enabled` platform flag must be ON.
- The link endpoint refuses to issue tokens when the bot isn't configured.

## 12. Telemetry

- `aiCallsTotal{analysis_type="warren", status=...}` and `aiRequestDuration{analysis_type="warren"}` (existing metrics).
- AI logs use `source: "warren_telegram"` (vs `warren_chat` for web).
- `trackEvent(userId, "warren_action", ...)` on confirmed write proposals.

## 13. Edge cases & gotchas

- Telegram callback_data is capped at 64 bytes — proposal IDs use 11-char base64url so the full callback fits in `p:<id>:y`.
- A user can have at most one linked chat at a time. Linking a second chat replaces the first.
- Snapshot build can fail (e.g. provider outage). The handler tolerates it and falls back to letting Warren use DB tools instead.
- Multi-chunk replies (Telegram 4096-char limit) are split on paragraph boundaries by `splitForTelegram`.
- Demo mode is web-only; Telegram only works for signed-in real users.
- Voice notes longer than 60s or larger than 4 MB are rejected before
  Whisper is called, with a localized message. The bot does NOT persist
  raw audio — the buffer is scoped to the request and only the transcript
  goes into `telegram_messages` (same as a typed user turn).
- TTS replies are best-effort: text always goes out first, so a TTS
  failure is silent. The spoken reply prepends a short "AI assistance,
  not advice" disclaimer because Telegram clients may auto-play voice
  bubbles before the user reads the text.

## 14. Tests

- Unit: `src/lib/telegram/__tests__/format.test.ts` (escaping, allocation bars, splitting, proposal keyboard, plain-text stripping for TTS).
- Unit: `src/lib/telegram/__tests__/handler.test.ts` (token consumption, /help, callback_query confirm flow, voice transcribe + TTS reply, voice rejection caps, Whisper failure with mocked clients).
- Unit: `src/lib/db/__tests__/telegram.test.ts` (link token TTL, link/unlink idempotence, history trimming).
- Unit: `src/lib/ai/warren/__tests__/build-snapshot.test.ts` (totals/allocation match the existing helpers).
- Unit: `src/lib/ai/transcribe.test.ts` (200/4xx/empty paths, missing key).
- Unit: `src/lib/ai/tts.test.ts` (200/4xx, empty input short-circuit, missing key).

## 15. Related skills and rules

- Skill: [`.cursor/skills/engineer-integrations/SKILL.md`](../../.cursor/skills/engineer-integrations/SKILL.md).
- Rule: [`.cursor/rules/legal-compliance.mdc`](../../.cursor/rules/legal-compliance.mdc) — Telegram is a new processor (Privacy Policy updated). Voice IN/OUT also processes audio via OpenAI; covered by the same processor disclosure.
- Related specs: [`warren-investing-knowledge`](warren-investing-knowledge.md), [`portfolio-review`](portfolio-review.md), [`portfolio-context-demo-mode`](portfolio-context-demo-mode.md).

## 16. Open questions / planned work

- Push price-alert notifications via Telegram (today: WhatsApp / email / push). The chat link is already in place.
- Stream token-by-token by editing the message every N tokens (today: send the final reply once).
- Render allocation/summary cards as PNG charts via `sharp` for richer Telegram messages.
- Inline mode and bot-in-group support (out of scope for v1).
- Per-user voice preference (opt out of TTS replies when typed input is preferred).
- Locale-specific TTS instructions (e.g. rioplatense Spanish accent for ES users).
