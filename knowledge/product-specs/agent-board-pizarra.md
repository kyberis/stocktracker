# Agent board (Pizarra)

> Opt-in Home widget where Warren and Clara post AI-selected proactive messages from portfolio and personal-finance signals.

## 1. Summary

The **Pizarra** (agent board) is an opt-in Home rail widget. When enabled, a cron job collects signals (news, movers, catalysts, alerts, FinPulse, recommendations, market digests, Clara savings, Office missions, etc.), an LLM picks up to three non-repetitive messages using recent history, and the UI shows them with chips to open Warren or Clara.

## 2. Status

- **Tier:** Free (proactive surface; chat chips use existing quotas)
- **Feature flag:** `agent_board_enabled` (platform, default off) + `user_settings.agent_board_enabled`
- **Health:** yellow (new)
- **Owning skill:** [`.cursor/skills/engineer-homepage/SKILL.md`](../../.cursor/skills/engineer-homepage/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| UI | `src/components/agent-board/PizarraWidget.tsx` | Home v2 rail + mobile footer |
| Hook | `src/hooks/useAgentBoard.ts` | Fetch/toggle/dismiss |
| Cron | `/api/cron/agent-board` | Manual/admin; production runs piggyback on `check-alerts` every 15 min |
| API | `/api/agent-board/*` | messages, settings, refresh |
| Lib | `src/lib/agent-board/*` | collect-signals, compose-messages |

## 4. Data model

- `user_settings.agent_board_enabled` — user opt-in
- `agent_board_messages` — persisted messages with `context_key` dedupe

## 5. API surface

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/agent-board/messages` | session | Active messages |
| POST | `/api/agent-board/messages/[id]/read` | session | Mark read |
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
- When Pizarra enabled, Home suppresses `AidWarrenNudge`
- Disclaimer on widget; no buy/sell advice in prompts

## 8. i18n

Keys `pizarra*` in EN + ES; message bodies generated in user language.

## 9. Demo

Static messages in `data/demo-agent-board.json`; demo Home shows board enabled.
