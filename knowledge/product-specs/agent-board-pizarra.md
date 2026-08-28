# Agent board (Pizarra)

> **Scriptable** home-screen widget where Warren (and Clara) post AI-selected notes when something matters for the user's holdings — not a notification channel.

## 1. Summary

The **Pizarra** is an iOS Scriptable widget (not shown on in-app Home, not under Profile → Notifications). Setup is `/widget/setup` (Pizarra variant) + widget token. Selecting Pizarra or fetching messages with a widget token arms the board. A cron collects signals; an LLM picks short non-repetitive notes. If nothing is new, the widget shows the **last** note(s), or “Nothing new in the market for your holdings.”

## 2. Status

- **Tier:** Free
- **Feature flag:** `agent_board_enabled` (platform, **default on**) + `user_settings.agent_board_enabled` (auto-set when using the widget)
- **Health:** yellow (new)
- **Owning skill:** [`.cursor/skills/engineer-mobile/SKILL.md`](../../.cursor/skills/engineer-mobile/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Scriptable | `/widget/setup` + `public/widget/trefolio-scriptable-pizarra.js` | Primary UI — Small / Medium / Large |
| Setup | `/widget/setup` (Pizarra radio) | Arms board + optional refresh (not Notifications) |
| Cron | `/api/cron/agent-board` | Manual/admin; production piggybacks on `check-alerts` every 15 min |
| API | `/api/agent-board/*` | messages (widget token), settings, refresh |
| Lib | `src/lib/agent-board/*` | collect-signals, compose-messages, run-user, run-cron |

## 4. Data model

- `user_settings.agent_board_enabled` — armed by widget setup / messages GET (cron gate)
- `agent_board_messages` — persisted messages with `context_key` dedupe

## 5. API surface

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/agent-board/messages` | session or widget token | Active notes, else last notes (`status: ok\|stale\|nothing_new`) |
| GET/PUT | `/api/agent-board/settings` | session | Arm/disarm (used by Widget Setup) |
| POST | `/api/agent-board/refresh` | session | On-demand compose (shares `runAgentBoardForUser` with cron) |

## 6. Signal sources (collect-signals)

Warren: market open, movers (≥2.5%), 52w proximity, calendar catalysts, portfolio recommendations, AID news cache, FinPulse (portfolio tickers), triggered alerts, market digests, concentration, weekly digest.

Clara: savings surplus, emergency fund gap, negative month balance, end-of-month pressure, Will recent tags (as Clara voice), Office pending mission steps.

## 7. Business logic

- Max 5 messages/user/day; compose picks ≤3 per run
- `context_key` UNIQUE prevents duplicate topics
- LLM receives last 15 messages to avoid thematic repetition
- Empty UI: last message (`stale`) or “nothing new for your holdings”
- Disclaimer on Scriptable widget; no buy/sell advice in prompts

## 8. i18n

Scriptable setup page copy is English (same as other widget scripts). Message bodies generated in user language.

## 9. Demo

N/A — not shown on `/demo` Home.
