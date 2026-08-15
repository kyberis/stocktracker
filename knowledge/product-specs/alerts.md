# alerts

> Price and percentage alerts delivered on user-selected channels.

## 1. Summary
Users create threshold or percent-change alerts (per ticker or portfolio-wide). The `check-alerts` cron evaluates them every 15 minutes and dispatches to the channels the user selected (email, Telegram, push, device). WhatsApp is not supported.

## 2. Status
- **Tier:** Soft caps — Free 25 active alerts, Pro 500 (`SOFT_CAPS.alerts`).
- **Feature flag:** `alerts_enabled`
- **Health:** B+
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/alerts/`](../../src/app/api/alerts) | CRUD. |
| API | [`src/app/api/ai-alerts/`](../../src/app/api/ai-alerts) | AI-specific alerts (separate). |
| Cron | [`src/app/api/cron/check-alerts/`](../../src/app/api/cron/check-alerts) | Evaluates + dispatches. |
| Admin | [`/admin/price-alerts`](../../src/app/(app)/admin/price-alerts) | Dispatch log + channel stats. |
| DB | [`src/lib/db/alerts.ts`](../../src/lib/db/alerts.ts) | Storage + `alert_dispatch_log`. |

## 4. Data model
- `price_alerts`: threshold or percent_change; one-shot for per-ticker; portfolio-wide uses same-day/ticker notify dedupe.
- Unique active keys:
  - threshold: `(user, ticker, condition, threshold, currency)`
  - percent: `(user, ticker, percent_basis, percent_value, is_portfolio_wide, portfolio_id)`
- `alert_dispatch_log`: every fire attempt with requested/sent/failed/skipped channels for admin observability.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET/POST/PATCH/DELETE | `/api/alerts` | user | Free+ | CRUD. |
| GET | `/api/admin/alert-dispatch` | admin | — | Summary + recent dispatch logs. |

## 6. UI surface
- Alert builder (threshold / % / portfolio-wide) in Tools → Alerts and inline forms.
- Notification channel prefs: email, Telegram, push, device (no WhatsApp).
- Admin → Messaging → Price Alerts.

## 7. Business logic
1. Cron loads active alerts + holdings, fetches quotes via Yahoo/cache (skips invalid/zero quotes).
2. Threshold compare uses FX when alert currency ≠ quote currency; skips cycle if FX missing.
3. `dispatchAlert` sends **only** to selected channels; maps legacy `whatsapp` → `telegram`.
4. One-shot: deactivate **after** successful send (or permanent skips). Transient channel failures leave the alert active for retry.
5. Portfolio-wide: `last_notified_*` same-UTC-day/ticker dedupe.

## 8. External dependencies
- Yahoo quotes + FX, Resend (email), Telegram Bot API, Web Push.

## 9. Currency / FX / tax implications
- Thresholds stored in alert currency; compared after converting live quote into that currency.
- Purchase-basis % converts cost basis into quote currency when needed.

## 10. i18n
- Email / Telegram notification templates localized via `email-i18n` / alert strings.

## 11. Permissions / tier gating / rate limits
- Soft alert count caps; Telegram has daily/monthly quotas.

## 12. Telemetry
- `alert_triggered`, `alert_dispatch`, `alert_email_sent`, `alert_telegram_sent`, `alert_push_sent`, `alert_device_sent`.
- Durable rows in `alert_dispatch_log` (admin panel).

## 13. Edge cases & gotchas
- Quote outage / zero price → no fire (alert stays active).
- Missing FX for cross-currency threshold → skip + log `fx_unavailable`.
- Unverified email / unlinked Telegram → skip that channel; finalize if no transient failures remain.

## 14. Tests
- DB tests; `alert-evaluation` unit tests; schema/e2e CRUD.

## 15. Related skills and rules
- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [notifications-inapp](notifications-inapp.md), [push-notifications](push-notifications.md), [email-system](email-system.md).

## 16. Open questions / planned work
- Sound/color per alert severity; mobile quiet hours; WhatsApp if product reintroduces it.
