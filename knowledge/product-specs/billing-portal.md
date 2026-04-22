# billing-portal

> Stripe customer portal entry.

## 1. Summary
Users can manage payment methods, invoices, and cancellation via Stripe's hosted portal.

## 2. Status
- **Tier:** Bifolio+
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/stripe/portal/`](../../src/app/api/stripe/portal) | Create portal URL. |

## 4. Data model
- Reads `subscriptions`.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/stripe/portal` | user | Pro | Return portal URL. |

## 6. UI surface
- "Manage subscription" button in `/account/billing`.

## 7. Business logic
- Redirect + log.

## 8. External dependencies
- Stripe.

## 9. Currency / FX / tax implications
- Stripe handles invoicing + tax.

## 10. i18n
- Stripe portal locale.

## 11. Permissions / tier gating / rate limits
- Paid users.

## 12. Telemetry
- `stripe_portal_opens_total`.

## 13. Edge cases & gotchas
- Churn-saver offers configured on Stripe side.

## 14. Tests
- Smoke.

## 15. Related skills and rules
- [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)
- Related specs: [stripe-checkout](stripe-checkout.md).

## 16. Open questions / planned work
- In-app cancellation flow (reason survey).
