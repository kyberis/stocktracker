# Payments and Subscriptions Reference

## Current Plan Matrix

- Free:
  - Price: 0 EUR
  - AI: 5 calls/month
  - Core features: Yahoo data, charts, cash, benchmarks
- Pro Monthly:
  - Price: 2 EUR/month
  - AI: unlimited
  - Pro features: fundamentals, intelligence, economic indicators, Alpha Vantage capabilities
- Pro Annual:
  - Price: 20 EUR/year
  - AI: unlimited
  - Same feature entitlements as Pro monthly

## Stripe Environment

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_ANNUAL`
- `APP_BASE_URL`

## Webhook Event Mapping

- `checkout.session.completed`
  - set `plan=pro`
  - set/confirm `stripe_customer_id`, `stripe_subscription_id`
- `customer.subscription.created`
  - sync `plan=pro` and subscription identifiers
- `customer.subscription.updated`
  - sync status, `cancel_at_period_end`, and `plan_expires_at`
- `customer.subscription.deleted`
  - set `plan=free`
  - clear `stripe_subscription_id`

## DB Fields

- `plan` (`free | pro`)
- `stripe_customer_id`
- `stripe_subscription_id`
- `plan_expires_at`
- `ai_calls_this_month`
- `ai_calls_reset_at`

## Analytics Events

- `billing_checkout_started`
- `billing_checkout_completed`
- `billing_portal_opened`
- `paywall_shown`

## QA Checklist

```md
Payments QA
- [ ] Free user gets 403 + reason on Pro endpoints
- [ ] Checkout endpoint returns Stripe URL for monthly and annual
- [ ] Webhook updates user plan after successful checkout
- [ ] Pro user can open billing portal
- [ ] AI limit blocks free users at 5/month
- [ ] UI shows upgrade CTAs for free users and manage CTA for Pro users
```
