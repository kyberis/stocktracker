---
name: engineer-payments-subscriptions
description: Implements subscription billing and tier enforcement with Stripe checkout, webhook synchronization, billing portal flows, and paywall logic. Use when working on payment, billing, Stripe, subscription, plan, checkout, portal, webhook, or paywall features.
---

# Payments and Subscriptions Engineer

## Scope

Own billing and subscription capabilities end-to-end:
- Stripe checkout and billing portal
- Stripe webhook synchronization
- plan/tier storage and entitlement checks
- paywall behavior and upgrade UX

## Primary Files

- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/webhook/route.ts`
- `src/app/api/billing/portal/route.ts`
- `src/lib/stripe.ts`
- `src/lib/subscription.ts`
- `src/lib/auth/guards.ts`
- `src/lib/db/index.ts`
- `src/components/ProfilePage.tsx`
- `src/components/SettingsModal.tsx`
- `.env.local.example`

## Core Rules

- Webhook handlers must be idempotent and safe on duplicate delivery.
- Plan source of truth is in DB (`users.plan` and Stripe linkage fields).
- API must enforce entitlements server-side; UI prompts are additive.
- Free tier defaults to `free`; Pro must never be granted without verified Stripe lifecycle.
- Never trust client-provided billing state.

## Stripe Workflow

1. Authenticated user starts checkout with monthly/annual interval.
2. Server creates/reuses Stripe customer and checkout session.
3. Stripe sends webhook events.
4. Webhook updates local plan and subscription fields.
5. App guards enforce access immediately.

## Entitlement Expectations

- Free:
  - Pro endpoints blocked with structured 403 response.
  - AI limited to 5/month.
- Pro:
  - Pro endpoints allowed.
  - AI unlimited.

## Quality Gates (Mandatory)

Every billing/subscription change MUST pass all gates below before delivery.

### Gate 1: E2E Tests (Playwright)

- **Add or update** an E2E spec in `e2e/` for any user-visible billing change (checkout, portal, paywall, tier gating).
- Existing E2E specs: `e2e/billing-checkout.spec.ts`, `e2e/subscription.spec.ts` — extend or add to these.
- Reuse helpers from `e2e/helpers.ts`.
- Cover free-to-pro upgrade path, paywall visibility, and downgrade behavior.
- Webhook-only changes don't need E2E but DO need unit test coverage.
- Run `npx playwright test <spec>` locally before marking done.

### Gate 2: All Themes

If the change affects billing UI, paywalls, upgrade CTAs, or pricing display:

- Verify rendering in **all four themes** (Default, Canvas, Terminal, Studio).
- `BlurredProSection`, `ProCompareCard`, and upgrade modals must be styled via CSS custom properties.
- Verify paywall overlays are readable in forced dark and forced light modes.

### Gate 3: Responsive Design

If the change affects billing UI:

- Test at mobile (375px), tablet (768px), and desktop (1280px) breakpoints.
- Pricing tables and tier comparison cards must reflow for small screens.
- Checkout redirect must work on all viewport sizes.
- Upgrade CTAs and paywall modals must be tappable and scrollable on mobile.

### Gate 4: Mobile Native (Capacitor)

For changes that affect checkout flows or subscription UI:

- Stripe checkout redirect must work inside Capacitor WebView.
- Verify return URL from Stripe checkout resolves correctly in native context.
- Billing portal link must open within the WebView (not spawn an external browser).
- Paywall and upgrade modals must respect safe area insets.
- Gate native-specific behavior with `isNativePlatform()` from `src/lib/capacitor.ts`.

### Gate 5: Code Coverage ≥ 80%

- New and modified files must maintain **≥ 80% line coverage**.
- Run `npx vitest run --coverage` and check the report for touched files.
- Webhook handlers and entitlement logic are especially critical — cover idempotency, duplicate delivery, and downgrade paths.
- Never reduce existing coverage on a file.

## Failure-Mode Checklist

```md
Billing Safety Checklist
- [ ] Missing env vars return explicit 501/400 errors
- [ ] Webhook signature is always verified
- [ ] Duplicate webhook deliveries do not corrupt state
- [ ] Downgrade path preserves user data
- [ ] Paywall responses are machine-readable for UI handling
- [ ] Code coverage ≥ 80% on new/modified files (`npx vitest run --coverage`)
- [ ] E2E spec added/updated for user-visible changes
- [ ] Works in all 4 themes (if UI change)
- [ ] Works at mobile/tablet/desktop breakpoints (if UI change)
- [ ] Capacitor/native: checkout redirect, portal, safe areas verified (if UI change)
```

## Additional Resource

- Detailed reference: [reference.md](reference.md)
