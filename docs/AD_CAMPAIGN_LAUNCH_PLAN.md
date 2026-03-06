# Ad Campaign Launch Plan

Pre-launch checklist for tasks that remain before running paid acquisition campaigns.
Items marked **DONE** were implemented in v0.34.0 or completed manually.

---

## DONE

- [x] **Rate limiting on signup/login** — 5 signups/IP/hour, 10 logins/IP/15 min via Upstash Redis (Turso fallback)
- [x] **Cloudflare Turnstile CAPTCHA** — blocks bot signups; optional in dev (set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`)
- [x] **MAX_PRO_SUBSCRIBERS raised to 500**
- [x] **Analytics retention** — events older than 90 days purged daily via cron
- [x] **Global OpenAI monthly cap** — 10,000 calls/month across all users; blocks with 429 when exhausted
- [x] **Security headers** — HSTS + Content-Security-Policy added to all responses
- [x] **Session secret enforced** — app throws in production if `APP_SESSION_SECRET` is unset
- [x] **Stripe production mode** — live keys, webhook, Price IDs, and billing portal configured. E2E test added (`e2e/billing-checkout.spec.ts`) using test card `4242 4242 4242 4242`.
- [x] **Domain & DNS** — `trefolio.com` purchased, DNS pointed to Vercel via Cloudflare, `APP_BASE_URL` set, Google OAuth redirect configured, Resend domain verified.
- [x] **Cloudflare Turnstile setup** — Turnstile site created, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` configured in Vercel.

---

## 1. Legal & Business Entity (Priority: Critical)

> **Cannot run ads or collect payments without this.**

| # | Task | Notes |
|---|------|-------|
| 1.1 | **Choose legal structure** | Sole proprietor vs Ltd/GmbH/SL. Country of operation determines VAT and Imprint requirements. |
| 1.2 | **Register the entity** | Required for invoicing, Stripe onboarding, and ad platform verification. |
| 1.3 | **Add Impressum** | Mandatory if operating from DE/AT/CH. Add to footer + dedicated `/imprint` page. |
| 1.4 | **Register for VAT** | Required once revenue exceeds the local micro-enterprise threshold. Stripe Tax can automate EU VAT collection once enabled. |
| 1.5 | **Enable Stripe Tax** | Activate in Stripe Dashboard → Tax. Handles reverse-charge and MOSS automatically. |

---

## 2. Infrastructure Upgrades (Priority: High)

Scale from free tiers before ad spend begins.

| # | Task | Est. Monthly Cost | Trigger |
|---|------|-------------------|---------|
| 2.1 | **Vercel Pro** | $20/month | Needed for 60s function timeout (broker imports), 1M invocations, and production analytics |
| 2.2 | **Turso Scaler** | $29/month | Needed when approaching 500M reads or 5 GB storage |
| 2.3 | **Upstash Pro** | $10/month | Needed for reliable rate limiting at scale (10K+ daily commands) |
| 2.4 | **Resend paid plan** | $20/month | Needed when email volume exceeds 3,000/month (verification + alerts) |
| 2.5 | **Alpha Vantage premium** | $49/month | Needed when global 75 req/min cap becomes a bottleneck (>50 concurrent Pro users) |
| 2.6 | **OpenAI billing alert** | Free | Set a monthly spending alert at $50 in OpenAI Dashboard → Billing → Limits |

**Estimated monthly infra cost at 500 users:** ~$130/month
**Estimated revenue at 5% Pro conversion (25 paying):** ~€105/month

---

## 3. Legal Compliance Updates (Priority: High)

These are triggered by the v0.34.0 changes per the legal-advisor skill.

| # | Task | Notes |
|---|------|-------|
| 3.1 | **Update Privacy Policy** | Add Cloudflare Turnstile to the third-party services table. Disclose that IP addresses and browser signals are sent to Cloudflare for bot detection. |
| 3.2 | **Update Privacy Policy — data retention** | Document the 90-day analytics event retention period. |
| 3.3 | **Verify Cloudflare DPA** | Cloudflare offers a standard DPA at cloudflare.com/supplemental-dpa. Confirm it covers Turnstile data processing. |
| 3.4 | **Cookie audit** | Turnstile may set a `cf_clearance` cookie. If so, classify it as essential (bot protection) in the Privacy Policy. |

---

## 4. Monitoring & Alerts (Priority: Medium)

| # | Task | Notes |
|---|------|-------|
| 4.1 | **Configure Grafana Cloud alerts** | Set alerts for: signup rate > 100/hour, 5xx error rate > 5%, DB write usage > 80%. |
| 4.2 | **OpenAI cost alert** | Set a $50/month limit in OpenAI Dashboard → Settings → Billing → Usage limits. |
| 4.3 | **Stripe webhook monitoring** | Enable webhook alerts in Stripe for failed deliveries. |
| 4.4 | **Uptime monitoring** | Use Vercel's built-in checks or a free service like UptimeRobot for `trefolio.com`. |

---

## 5. Ad Campaign Preparation (Priority: Medium)

| # | Task | Notes |
|---|------|-------|
| 5.1 | **Google Ads account** | Requires the legal entity and `trefolio.com` for verification. |
| 5.2 | **Meta Ads account** | Requires business verification. |
| 5.3 | **Landing page A/B testing** | Consider Vercel's edge middleware for A/B testing different headlines. |
| 5.4 | **Conversion tracking** | Add Google Ads and Meta Pixel conversion events to the signup success flow. Requires consent mechanism (cookie banner) if pixels set tracking cookies. |
| 5.5 | **UTM parameter tracking** | Store `utm_source`, `utm_medium`, `utm_campaign` from landing page visits so you can measure which ads convert. |
| 5.6 | **Demo video** | Record a 30-60s product demo for ad creatives. |

---

## 6. Pre-Launch Checklist

Run through this before flipping the ads on:

```
[ ] Legal entity registered
[x] Stripe live mode active and tested (E2E test in e2e/billing-checkout.spec.ts)
[x] Production domain configured with SSL (trefolio.com via Cloudflare)
[ ] APP_SESSION_SECRET set in Vercel
[ ] CRON_SECRET set in Vercel
[x] Turnstile keys configured
[x] Resend domain verified
[x] Google OAuth redirect updated for production domain
[ ] Grafana alerts configured
[ ] OpenAI billing cap set ($50/month)
[ ] Privacy Policy updated for Turnstile + retention
[ ] Impressum page added (if required)
[ ] Vercel upgraded to Pro
[ ] First $50 ad budget ready
[ ] Conversion tracking in place
```

---

## Cost Summary

| Phase | Monthly Cost | Revenue Needed |
|-------|-------------|---------------|
| **0–100 users** (free tiers) | ~€5 (domain only) | €0 |
| **100–500 users** (paid infra) | ~€130 | 3 Pro subscribers (~€15) |
| **500–2,000 users** | ~€200 | 10 Pro subscribers (~€50) |
| **2,000+ users** | ~€350+ | 25 Pro subscribers (~€125) |

At 5% free→Pro conversion, you need ~2,500 free users to sustain the infrastructure costs.
At 10% conversion, you need ~1,250 free users.
