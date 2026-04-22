# stripe-checkout

> Stripe-hosted checkout for Bifolio and Trefolio tiers.

## 1. Summary
We create checkout sessions server-side with the correct price IDs and redirect the user to Stripe. Subscription state syncs via webhook.

## 2. Status
- **Tier:** Free (entry point); Paid tiers (Bifolio, Trefolio) post-checkout.
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/stripe/checkout/`](../../src/app/api/stripe/checkout) | Create session. |
| Library | [`src/lib/stripe.ts`](../../src/lib/stripe.ts) | Client. |

## 4. Data model
- Reads `subscriptions`; session references stored temporarily.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/stripe/checkout` | user | Free | Create session, return URL. |

## 6. UI surface
- Pricing CTA on `/landing` and `/account/billing`.

## 7. Business logic
- Price IDs per interval (monthly, yearly, lifetime) per locale.
- Success URL returns to `/account/billing?success=1`; cancel URL keeps user on pricing.

## 8. External dependencies
- Stripe.

## 9. Currency / FX / tax implications
- Stripe handles VAT; we display gross amounts. We do not compute tax ourselves.

## 10. i18n
- Stripe checkout locale mirrors user locale.

## 11. Permissions / tier gating / rate limits
- Logged-in users only.

## 12. Telemetry
- `stripe_checkout_sessions_total`.

## 13. Edge cases & gotchas
- Duplicate sessions within 5s deduped to avoid double-charges.

## 14. Tests
- Integration with mocked Stripe.

## 15. Related skills and rules
- [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)
- Related specs: [stripe-webhook](stripe-webhook.md), [subscription-tiers](subscription-tiers.md), [paywall](paywall.md).

## 16. Open questions / planned work
- Add Apple/Google Pay explicit buttons.
