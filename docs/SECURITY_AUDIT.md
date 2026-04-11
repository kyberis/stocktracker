# Security audit log

## npm audit (dependency CVEs)

**How to run** (if the default registry returns 404, use the public registry):

```bash
npm audit --registry https://registry.npmjs.org
npm audit fix --registry https://registry.npmjs.org
```

**Last snapshot** (2026-04-11, after `npm audit fix` without `--force`):

| Severity | Count | Notes |
|----------|-------|--------|
| Critical | 2 | Transitive **axios** via `snaptrade-typescript-sdk` — no upstream fix in tree; track SDK releases |
| High | 5 | **next** (fix requires major bump), **tar** via `@capacitor/cli`, **undici** via `@vercel/blob`, **xlsx** (SheetJS — no fix in community package) |
| Moderate | 1 | Transitive |

**Accepted / tracked risks**

- **xlsx**: Used for client-side portfolio import; keep files size-limited and avoid server-side parsing of untrusted xlsx where possible.
- **snaptrade / axios**: Monitor `snaptrade-typescript-sdk` releases; upgrade when axios is bumped.
- **next**: Plan framework upgrades on a separate release train; review [Next.js security advisories](https://github.com/vercel/next.js/security/advisories).

**Automation**

- [Dependabot](../.github/dependabot.yml) opens weekly PRs for npm dependencies.

## Environment (production)

| Variable | Required in production | Purpose |
|----------|-------------------------|---------|
| `APP_SESSION_SECRET` | Yes (app throws if missing) | JWT signing for `trefolio_session` |
| `CRON_SECRET` | Yes on production and Vercel preview (routes return 500 if unset) | Bearer token for `/api/cron/*` |
| Stripe / Resend / Linear webhook secrets | Per integration docs | Webhook signature verification |

See `src/lib/cron-logging.ts` (`verifyCronAuth`) and `src/lib/auth/session.ts`.

## CSP hardening

See inline roadmap in [`next.config.mjs`](../next.config.mjs) (Content-Security-Policy section).

## IDOR (insecure direct object reference) review

**Conventions in this codebase**

- Prefer `session.userId` from [`requireSession`](src/lib/auth/guards.ts) for all mutations; avoid trusting `userId` from the request body.
- Dynamic routes (`/api/.../[id]`) should scope SQL with `WHERE ... user_id = ?` and the session user (see [`updatePost`](src/lib/db/social-posts.ts), [`deletePost`](src/lib/db/social-posts.ts)).
- **Public read** endpoints must enforce visibility (e.g. social posts: draft/private/network checks in [`src/app/api/social/posts/[id]/route.ts`](src/app/api/social/posts/[id]/route.ts)).

**Automated coverage**

- DB layer: [`src/lib/db/social-posts.test.ts`](src/lib/db/social-posts.test.ts) asserts `updatePost` / `deletePost` fail when `user_id` does not match.

**Manual pass (quarterly or before major release)**

- Spot-check routes under `src/app/api/**/[id]` and admin routes for `requireAdmin` / `requireSession` usage.
- Confirm no API accepts a `userId` query param to read another user’s holdings or portfolios.

## Dynamic application security testing (DAST)

Optional manual pass: **OWASP ZAP** or **Burp Suite** against staging with a test account.

**Smoke tests** in-repo: [`e2e/security-smoke.spec.ts`](../e2e/security-smoke.spec.ts) (401 on protected APIs without session).

**Cron auth** is covered by unit tests in [`src/lib/cron-logging.test.ts`](../src/lib/cron-logging.test.ts) (production/preview require `CRON_SECRET`).
