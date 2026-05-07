# Unified accounts admin

## What
A read-write admin surface inside the trefolio-accounts IdP at
`/admin/users` that lets a unified-accounts operator:

1. List every user registered on `user.trefolio.com` (the IdP).
2. See which products (trefolio, Clara, Will) each user has a local account
   in, by fanning out to each app's `/api/v1/users/by-sub/:sub` service-token
   endpoint with the IdP-known email.
3. Inspect a user's IdP record (sub, email-verification, Google/Apple links,
   plan, pro-until, source of last entitlement update).
4. Mutate IdP-side state: change plan, set/clear `pro_until`, force-set
   email-verified, reset password (bcrypt), hard-delete the IdP user.
5. Jump from the linked-products card straight into each product's own admin
   tools when the operator needs deeper actions (impersonate, refunds,
   feature flags, …).

The IdP itself stays the system of record for identity + entitlements; this
admin page is the **single pane of glass** on top of it.

## Why
Before this, an operator had to log into three separate admin UIs (trefolio,
Clara, Will) to see if a given email had accounts in each, and there was no
way at all to manage IdP-side records (plan, pro_until, password reset,
verified flag) without poking at the database directly. That made support
slow and error-prone, especially mid-migration when users were still moving
to unified accounts.

## Where
- IdP pages: `external/accounts/src/app/admin/{layout,page,users}/...`
- IdP DB helpers: `external/accounts/src/lib/db.ts`
  (`listUsersForAdmin`, `getAdminUserDetail`, `deleteUserBySub`).
- IdP admin guard: `external/accounts/src/lib/admin.ts` (env-driven
  `IDP_ADMIN_EMAILS` allow-list + `idp_session` cookie).
- IdP fan-out helper: `external/accounts/src/lib/product-links.ts`.
- Service endpoints (consumed by the admin pages):
  - trefolio: `src/app/api/v1/users/by-sub/[sub]/route.ts`.
  - Clara: `external/etracker/src/app/api/v1/users/by-sub/[sub]/route.ts`.
  - Will: `external/notetaker/src/app/api/v1/users/by-sub/[sub]/route.ts`.

## How auth works
- Membership in the admin allow-list comes from
  `IDP_ADMIN_EMAILS` (comma-separated, lower-cased at module load).
- Any signed-in IdP user (valid `idp_session` cookie) whose email matches the
  list is admin. There is no DB-level admin flag — we keep the IdP
  user table intentionally lean. **Demoting** an admin therefore means
  removing them from the env var, by design.
- If `IDP_ADMIN_EMAILS` is empty, `/admin/*` renders an "Admin disabled"
  splash with setup instructions instead of redirecting (so a fresh
  deployment is self-explanatory).

## How the linked-apps badges work
- Per row, the listing calls `probeProductLinks({ sub, email })` which fans
  out to each product's `/api/v1/users/by-sub/:sub?email=…` endpoint with
  `Authorization: Bearer ${IDP_SERVICE_TOKEN}` (same shared secret used by
  the OIDC callback and entitlements-sync flows).
- Each product responds `{ exists: false }` when no local row matches the
  IdP-known email, or `{ exists: true, id, …details }` otherwise. trefolio
  also tries `idp_sub = ?` first, then falls back to email.
- Failures are isolated per-product and rendered as an "unreachable" badge —
  one app being down does not break the listing.
- Hard-coded 1.8 s timeout per product call to keep the listing responsive
  when one app is slow.

## Admin actions
The detail page (`/admin/users/[sub]`) exposes Server Actions for:

| Action                | Effect                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| Set plan              | Upserts `entitlements.plan` to `free` or `pro`. `pro` defaults to a 365-day window unless `pro_until` set. **Stripe-managed Pro** (`plan` + `source` from Stripe webhooks) cannot be downgraded to Free from this UI — cancel or change billing in Stripe first; saving Pro edits keeps `source` as `stripe`. |
| Set pro_until         | When plan is `pro`, persists the chosen ISO date as the entitlement's `pro_until`.                         |
| Reset password        | Generates a fresh bcrypt hash; clears the legacy `password_plain` field.                                   |
| Toggle email-verified | Flips the IdP-side `email_verified` flag. Useful for migrated users who can't receive verification mail.   |
| Delete IdP user       | Hard-deletes the user, plus their entitlements / telegram links / unused auth codes.                       |

The local trefolio / Clara / Will rows are intentionally **not** deleted by
the IdP-delete action — products keep their own admin surfaces for that.

The service-token import endpoint `POST /api/v1/admin/users/import` returns **409**
with `{ "error": "stripe_managed_pro", … }` when the JSON body explicitly sets
`"plan": "free"` for a user who is **Pro** with **`source`** from Stripe (same rule as the admin UI).

## Trade-offs
- **No write actions on remote products.** The IdP admin shows links into
  each product's admin instead of mutating remote state directly. Reasoning:
  the products already have richer admin tools (impersonate, refunds, AI
  logs, feature flags, …) and replicating them here would be both expensive
  and risky. The IdP admin is the index; the products stay the source of
  truth for product-specific state.
- **No DB-backed admin role.** A future iteration can add `is_admin` to the
  IdP `users` table; for now the env var is enough and survives DB resets.

## See also
- [Unified accounts spec](unified-accounts-idp.md)
- [Cutover runbook](../runbooks/unified-accounts-cutover.md)
- [Design doc](../design-docs/unified-accounts-and-billing.md)
