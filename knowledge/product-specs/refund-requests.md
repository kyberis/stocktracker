# refund-requests

> User-initiated refund request flow (EU law 14-day).

## 1. Summary
Users can request a refund within X days. Request form collects reason, admin approves or denies; on approval we refund via Stripe and downgrade.

## 2. Status
- **Tier:** Bifolio+
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/refund-requests/`](../../src/app/api/refund-requests) | User CRUD. |
| Admin | [`src/app/api/admin/refund-requests/`](../../src/app/api/admin/refund-requests) | Approve/deny. |
| DB | [`src/lib/db/refund-requests.ts`](../../src/lib/db/refund-requests.ts) | Storage. |

## 4. Data model
- `refund_requests`: user, amount, reason, state, handled_at.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/refund-requests` | user | Pro | Create. |
| GET/PATCH | `/api/admin/refund-requests` | admin | Admin | Triage. |

## 6. UI surface
- Form in `/account/billing`; admin panel list with actions.

## 7. Business logic
- On approve: Stripe refund → subscription end-of-period downgrade → notify user.

## 8. External dependencies
- Stripe.

## 9. Currency / FX / tax implications
- Stripe handles tax refund.

## 10. i18n
- Form localized.

## 11. Permissions / tier gating / rate limits
- Rate-limited form submission.

## 12. Telemetry
- `refunds_requested_total`, `refunds_approved_total`.

## 13. Edge cases & gotchas
- 14-day rule: display deadline in UI.

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)
- [`.cursor/skills/legal-advisor`](../../.cursor/skills/legal-advisor/SKILL.md)
- Related specs: [stripe-webhook](stripe-webhook.md).

## 16. Open questions / planned work
- Auto-approve under threshold amount.
