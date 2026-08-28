# Agent board (Pizarra)

> Opt-in **Scriptable** home-screen widget where Warren and Clara post AI-selected proactive messages from portfolio and personal-finance signals.

## 1. Summary

The **Pizarra** (agent board) is an opt-in iOS Scriptable widget (not shown on the in-app Home). When enabled in Profile → Notifications, a cron collects signals (news, movers, catalysts, alerts, FinPulse, recommendations, market digests, Clara savings, Office missions, etc.), an LLM picks up to three non-repetitive messages using recent history, and Scriptable shows them on the lock/home screen.

## 2. Status

- **Tier:** Free
- **Feature flag:** `agent_board_enabled` (platform, default off) + `user_settings.agent_board_enabled`
- **Health:** yellow (new)
- **Owning skill:** [`.cursor/skills/engineer-mobile/SKILL.md`](../../.cursor/skills/engineer-mobile/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Scriptable | `/widget/setup` + `public/widget/trefolio-scriptable-pizarra.js` | Primary UI — Small / Medium / Large |
| Settings | Profile → Notifications | Opt-in toggle + refresh on enable |
| Cron | `/api/cron/agent-board` | Manual/admin; production piggybacks on `check-alerts` every 15 min |
| API | `/api/agent-board/*` | messages (widget token), settings, refresh |
| Lib | `src/lib/agent-board/*` | collect-signals, compose-messages |

## 4. Data model

- `user_settings.agent_board_enabled` — user opt-in
- `agent_board_messages` — persisted messages with `context_key` dedupe

## 5. API surface

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/agent-board/messages` | session or widget token | Active messages for Scriptable |
| POST | `/api/agent-board/messages/[id]/read` | session | Mark read (optional; Scriptable is display-only) |
| POST | `/api/agent-board/messages/[id]/dismiss` | session | Dismiss |
| GET/PUT | `/api/agent-board/settings` | session | Opt-in toggle |
| POST | `/api/agent-board/refresh` | session | On-demand compose after enable |

## 6. Signal sources (collect-signals)

Warren: market open, movers (≥2.5%), 52w proximity, calendar catalysts, portfolio recommendations, AID news cache, FinPulse (portfolio tickers), triggered alerts, market digests, concentration, weekly digest.

Clara: savings surplus, emergency fund gap, negative month balance, end-of-month pressure, Will recent tags (as Clara voice), Office pending mission steps.

## 7. Business logic

- Max 8 messages/user/day; compose picks ≤3 per run
- `context_key` UNIQUE prevents duplicate topics
- LLM receives last 15 messages to avoid thematic repetition
- No in-app Home surface — Scriptable only
- Disclaimer on Scriptable widget; no buy/sell advice in prompts

## 8. i18n

Keys `pizarra*` in EN + ES for Profile settings; Scriptable setup page copy is English (same as other widget scripts). Message bodies generated in user language.

## 9. Demo

N/A — not shown on `/demo` Home.
