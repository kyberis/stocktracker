# Clover assistant

> Default in-app AI: one conversation that orchestrates Warren (portfolio) and Clara (personal finance).

## 1. Summary

Signed-in users talk to **Clover**. Clover routes portfolio work through Warren tools and personal-finance through Clara (`consultClaraSavings`). If Clara is not linked, Clover proposes creating a Clara space (SSO). Telegram bot `@cloveraiassistant_bot` uses the same orchestration when env is configured.

## 2. Status

- **Tier:** Free / Pro (`ai_consult` quota)
- **Feature flag:** `clover_assistant` (default ON)
- **Health:** new
- **Owning skill:** engineer-homepage / engineer-integrations

## 3. Entry points

| Surface | Path |
|---------|------|
| Dock | `AgentDock` — Clover primary; Warren chip only if `userHasWarren` |
| Drawer | `WarrenDrawer` with `persona="clover"` |
| Bootstrap | `GET /api/clover/bootstrap` |
| Telegram webhook | `POST /api/webhooks/telegram/clover/[secret]` |
| Profile | `CloverTelegramConnectCard` |
| Link API | `/api/integrations/telegram/clover/link` |

## 4. Env (server)

- `CLOVER_TELEGRAM_BOT_TOKEN`
- `CLOVER_TELEGRAM_BOT_USERNAME` (without `@`)
- `CLOVER_TELEGRAM_WEBHOOK_SECRET`

Avatar for BotFather: `public/avatars/clover-telegram-botfather.png`

## 5. Visibility rule

- Clover on + no Warren history → Clover only
- Clover on + has Warren (`ai_logs` warren_* or telegram link) → Clover + Warren
- Clover off → legacy W·C dock

## 6. Tests

- `src/lib/ai/clover/user-has-warren.test.ts`
- System prompt channel `clover` identity
- E2E agent-dock (flexible selectors)
