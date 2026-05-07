# Unified accounts cutover runbook

This runbook covers Phase 6 of the [unified accounts plan](../exec-plans/active/unified-accounts.md):
moving the source of truth for users, sessions and Pro subscriptions from each
of the three product apps (trefolio, Clara, Will) to the dedicated IdP at
`user.trefolio.com`.

> **Audience:** the on-call engineer running the cutover.
>
> **Reversibility:** every step except step 5 (legacy code removal) is
> reversible by flipping the env var back. Step 5 is intentionally a separate
> deploy that ships *after* a 7-day soak.

## Pre-flight (T-1 day)

- [ ] All three apps are green on `main` and last deploy is at least 24h old.
- [ ] IdP at `user.trefolio.com` is healthy. Smoke-test:
      `curl -sf https://user.trefolio.com/.well-known/openid-configuration | jq .issuer`
      should print `"https://user.trefolio.com"`.
- [ ] Every product app has the four IdP env vars set in production:
      `IDP_BASE_URL`, `IDP_CLIENT_ID`, `IDP_CLIENT_SECRET`, `IDP_SERVICE_TOKEN`.
- [ ] The IdP itself has `IDP_ADMIN_EMAILS` set to a comma-separated allow-list
      of operator emails (otherwise `/admin/users` is hidden behind a setup
      splash). Optional: `TREFOLIO_BASE_URL`, `CLARA_BASE_URL`, `WILL_BASE_URL`
      — only override when running against non-default hosts.
- [ ] DB backup of all three product DBs.
- [ ] Status page note prepared (5-minute scheduled maintenance window).

## Step 1 — Freeze local user writes (T+0)

In the trefolio Vercel project:

```bash
vercel env add FREEZE_LOCAL_USER_WRITES true production
vercel deploy --prod
```

Equivalent in Clara (`external/etracker`) and Will (`external/notetaker`)
Vercel projects per their own env conventions.

After deploy:

- Local signup endpoints should return `503` with the unified-accounts message.
- Existing logged-in sessions are unaffected.
- The OIDC callback is **not** gated by this flag, so first-time IdP logins
  can still create local rows during the migration.

## Step 2 — Run migrations

Run the unified migration command from this repo root. It executes trefolio,
Clara and Will migrations sequentially against the IdP admin API.

```bash
# smoke test (small batches per app)
IDP_BASE_URL=https://user.trefolio.com \
IDP_SERVICE_TOKEN=$IDP_SERVICE_TOKEN \
npm run idp:migrate-all-users -- --limit=100

# full migration
npm run idp:migrate-all-users
```

Behavior:
- Idempotent: the IdP import endpoint is upsert-by-email (`created` vs `linked`).
- Duplicates across Clara and Will are unified automatically when emails match.
- Pro entitlements are never downgraded by a later Free import from another app.

**Stripe (trefolio only):** Subscriptions are billed in trefolio. After users have
`idp_sub`, copy `stripe_customer_id` / `stripe_subscription_id` into the IdP
`stripe_customers` table (and set entitlements `source = stripe`) by running:

```bash
IDP_BASE_URL=https://user.trefolio.com \
IDP_SERVICE_TOKEN=$IDP_SERVICE_TOKEN \
npm run idp:migrate-subscriptions
```

Optional `--limit` / `--dry-run`. Configure `STRIPE_SECRET_KEY` on the IdP so the
import handler can refresh `current_period_end` from the Stripe API when
possible.

Verify on the IdP DB:

```sql
SELECT count(*) FROM "User";        -- should equal sum of users across apps
SELECT count(*) FROM "Entitlement"; -- should equal current Pro subscriber count
```

## Step 3 — Flip USE_LEGACY_AUTH to false

Per app:

```bash
vercel env add USE_LEGACY_AUTH false production
vercel env add BILLING_REDIRECT_TO_IDP true production
vercel deploy --prod
```

After deploy:

- `/api/auth/login`, `/api/auth/signup`, `/api/auth/google`, `/api/auth/apple`
  return `410 Gone` with a redirect URL to `user.trefolio.com`.
- `/api/auth/oidc/start` and `/callback` are the only auth path.
- The "Upgrade" button in `/profile?section=subscription` redirects to
  `https://user.trefolio.com/upgrade?from=trefolio` (mirror for Clara/Will).
- Stripe webhook ([src/app/api/billing/webhook/route.ts](../../src/app/api/billing/webhook/route.ts))
  becomes a no-op; the IdP is the single Stripe consumer.

## Step 4 — Send the unified-accounts email

```bash
RESEND_API_KEY=$RESEND_API_KEY \
APP_BASE_URL=https://trefolio.com \
npm run idp:send-unified-email -- --limit=50    # smoke test
npm run idp:send-unified-email                   # full run
```

The script:
- Picks user locale from `user_settings.preferred_language` (en/es).
- Honours marketing opt-out (`email_notifications_enabled`).
- Idempotent via the `unified_accounts_email_log` table.

Send equivalent emails from Clara and Will using each app's existing email
helper. Same copy, same locale picking.

## Step 5 — Schedule legacy auth code removal

After a **7-day soak** with no auth incidents and no rollback, open a PR per
app that:

1. Deletes `/api/auth/login`, `/api/auth/signup`, `/api/auth/google`,
   `/api/auth/apple` and the passkey routes.
2. Deletes `useLegacyAuth()` and `freezeLocalUserWrites()` flags from
   `src/lib/idp/config.ts`.
3. Removes the local Stripe webhook code and any local checkout helpers.
4. Drops unused columns from local users table (keep `idp_sub`,
   `email`, `display_name`, `username`, `plan`, `last_active_at`, etc.).
5. Bumps the trefolio CURRENT_VERSION and adds a release note.

## Step 6 — Operate via the unified admin

After the cutover, day-to-day user operations move to
[`https://user.trefolio.com/admin/users`](https://user.trefolio.com/admin/users):

- List + search every IdP user, with badges showing whether they have a local
  trefolio / Clara / Will record (resolved by IdP-known email).
- Per-user detail page (`/admin/users/<sub>`) shows the linked-product cards
  with each app's local id, plan/role, and a deep-link into that app's own
  admin tools.
- Server actions cover plan upgrades / downgrades, custom `pro_until` dates,
  bcrypt password resets, manual email-verified flips, and IdP-side hard
  deletes. Local product rows are preserved on IdP delete; remove them in
  each product's admin if needed.

See [`unified-accounts-admin`](../product-specs/unified-accounts-admin.md)
for the full spec.

## Rollback

| Issue                                       | Action                                                         |
| ------------------------------------------- | -------------------------------------------------------------- |
| IdP unreachable / OIDC callback failures    | `USE_LEGACY_AUTH=true` + redeploy on each app.                  |
| Migration script wrote bad `idp_sub` values | Truncate `idp_sub` for affected rows; re-run script.           |
| Email delivery problems                     | Stop the script, investigate Resend logs, resume (idempotent). |
| Stripe webhook double-billing               | Disable the local webhook URL in Stripe dashboard.             |

The cutover is reversible at any time before step 5.
