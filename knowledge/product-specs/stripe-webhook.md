# stripe-webhook

> Webhook handler that reconciles subscription state.

## 1. Summary
Listens for `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed`, etc. Updates `subscriptions` + `subscription_history` atomically.

## 2. Status
- **Tier:** system
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/stripe/webhook/`](../../src/app/api/stripe/webhook) | Handler. |

## 4. Data model
- `subscriptions`, `subscription_history`.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/stripe/webhook` | signed | system | Verifies Stripe signature. |

## 6. UI surface
- None.

## 7. Business logic
- Signature verified with endpoint secret from env.
- Idempotent by `event.id`.
- Grants/removes features per current price ID → tier map.

## 8. External dependencies
- Stripe.

## 9. Currency / FX / tax implications
- Invoice + tax tracked by Stripe; we log invoice IDs.

## 10. i18n
- N/A.

## 11. Permissions / tier gating / rate limits
- Open endpoint (signature required).

## 12. Telemetry
- `stripe_webhook_events_total{type,ok|fail}`.

## 13. Edge cases & gotchas
- Out-of-order events — use `period_end` as source of truth.
- Missing customer mapping → alert.

## 14. Tests
- Unit on handler switch.

## 15. Related skills and rules
- [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)
- Related specs: [stripe-checkout](stripe-checkout.md), [subscription-tiers](subscription-tiers.md).

## 16. Open questions / planned work
- Failed-payment retry UX.
