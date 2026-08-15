# email-system

> Transactional and marketing email (Resend).

## 1. Summary
All outbound email goes through `src/lib/email/` helpers, with templated React Email components. Covers auth (verify/reset), transactional (alerts, digests), and marketing (onboarding, retention, churn).

## 2. Status
- **Tier:** system
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`ux-writer`](../../.cursor/skills/ux-writer/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/email/`](../../src/lib/email) | Templates + sender. |
| API | [`src/app/api/admin/email-send-logs/`](../../src/app/api/admin/email-send-logs) | Admin logs. |
| DB | [`src/lib/db/email-send-log.ts`](../../src/lib/db/email-send-log.ts) | Send log. |

## 4. Data model
- `email_send_log`: per-send record.
- `email_unsubscribe`: per-category unsubscribe tokens.

## 5. API surface
- Admin list/resend UI only.

## 6. UI surface
- Account settings unsubscribe toggles.

## 7. Business logic
- Retry w/ exponential backoff; idempotency keys on transactional sends.
- Every marketing email includes physical address + unsubscribe link (legal requirement).

## 8. External dependencies
- Resend.

## 9. Currency / FX / tax implications
- Invoices/receipts handled by Stripe separately.

## 10. i18n
- Localized templates.

## 11. Permissions / tier gating / rate limits
- Category-based suppression; marketing gated on user consent.

## 12. Telemetry
- `email_sent_total{template}`, `email_bounced_total`.

## 13. Edge cases & gotchas
- Do not send marketing emails to deleted users.
- Comply with [`automated-user-comms`](../../.cursor/skills/automated-user-comms/SKILL.md).

## 14. Tests
- Snapshot tests on React Email templates.

## 15. Related skills and rules
- [`ux-writer`](../../.cursor/skills/ux-writer/SKILL.md)
- [`automated-user-comms`](../../.cursor/skills/automated-user-comms/SKILL.md)
- Related specs: [weekly-digest](weekly-digest.md), [daily-market-digest](daily-market-digest.md), [admin-email-flows](admin-email-flows.md).

## 16. Open questions / planned work
- Flow-level observability shipped in [admin-email-flows](admin-email-flows.md) (read-only map + 7d/30d template stats).
- Deeper deliverability dashboards per campaign still open.
