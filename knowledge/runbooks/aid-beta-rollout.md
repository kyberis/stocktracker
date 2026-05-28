# AID beta rollout runbook

Operational steps to enable **AID (Advanced Investor Dashboard)** for staff and beta testers in production.

## Prerequisites

- Feature flag `aid_beta` registered in platform settings and admin UI.
- Users must be authenticated on trefolio (same IdP account for Will/Clara insights).

## 1. Environment variables (Vercel)

Set on the **trefolio** Vercel project (Production + Preview as needed):

| Variable | Required | Purpose |
|----------|----------|---------|
| `TAVILY_API_KEY` | Recommended | Web search for earnings-day news digests |
| `CLARA_BASE_URL` | Optional | Clara savings insight card (`https://clara.trefolio.com` in prod) |
| `WILL_BASE_URL` | Optional | Will note insight card (`https://will.trefolio.com` in prod) |
| `IDP_SERVICE_TOKEN` | Optional | Server-to-server auth for Clara/Will internal APIs |
| `CRON_SECRET` | Required (prod) | Auth for `/api/cron/aid-digest` |

### CLI examples

```bash
# Tavily (earnings web search)
vercel env add TAVILY_API_KEY production

# Sister apps (read-only insight cards)
vercel env add CLARA_BASE_URL production
vercel env add WILL_BASE_URL production
vercel env add IDP_SERVICE_TOKEN production
```

After adding env vars, **redeploy** production so cron and API routes pick them up.

Local dev: add `TAVILY_API_KEY` to `.env.local` (never commit). Clara/Will return dev stubs when sister URLs are unset.

## 2. Enable the flag

### Global (all users)

```bash
npx tsx scripts/enable-aid-beta.ts
```

### Per-user beta testers (recommended first)

```bash
npx tsx scripts/enable-aid-beta-users.ts beta1@example.com beta2@example.com
```

### Global + named testers

```bash
npx tsx scripts/enable-aid-beta-users.ts --global beta1@example.com
```

### Disable

```bash
npx tsx scripts/enable-aid-beta.ts --off
npx tsx scripts/enable-aid-beta-users.ts --off user@example.com
```

Admin UI: **Admin → Feature flags** — toggle `aid_beta` globally or per user.

## 3. Smoke checklist

| Check | Expected |
|-------|----------|
| Home with flag | **Beta · AID** CTA visible |
| `/aid` | Portfolio pulse, news, Warren column |
| News refresh | `POST /api/aid/refresh` updates ticker row |
| Cron | `GET /api/cron/aid-digest` with `Authorization: Bearer $CRON_SECRET` returns `{ warmed: N }` |
| Mobile 375px | Warren opens as sheet; modals full-width bottom sheet |
| Will/Clara | Real data when linked; connect links when not |
| Will tags API | Deploy Will with `GET /api/internal/office/recent-tags` before prod tag cloud |

## 4. Deploy Will (recent-tags)

After merging `external/notetaker` changes, deploy **Will** to production (`will.trefolio.com`) so trefolio `fetchWillRecentTags` returns real tag data instead of hashtag fallback.

## 5. Cron schedule

Registered in `vercel.json`: `0 */6 * * *` — pre-warms digest cache for up to 20 `aid_beta` users per run.

## 6. Rollback

1. Disable flag globally: `npx tsx scripts/enable-aid-beta.ts --off`
2. Remove per-user overrides in admin if needed
3. Cron continues but warms zero users when flag is off globally and no overrides exist

## Related

- Compliance checklist: [`knowledge/compliance/aid-beta-compliance.md`](../compliance/aid-beta-compliance.md)
- Exec plan: [`knowledge/exec-plans/active/advanced-investor-dashboard.md`](../exec-plans/active/advanced-investor-dashboard.md)
- Product spec: [`knowledge/product-specs/advanced-investor-dashboard.md`](../product-specs/advanced-investor-dashboard.md)
