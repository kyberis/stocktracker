# Real-estate zone screening

- **Status:** active
- **Owner:** agent
- **Started:** 2026-08-27
- **Target:** 2026-09-15

## Goal

Users with `real_estate_screening_enabled` can select Portugal INE zones and mortgage/budget parameters in the UI, launch a durable async job, and read a native report at `/real-estate/screening/runs/[id]`. Listing portals remain stubbed until the data-source ADR is approved.

## Acceptance criteria

- [x] Flag, quota, Zod params, product spec
- [x] `re_*` tables + zona-sync cron + recover cron
- [x] Entry UI: multi-zone search + visible params + home CTA
- [x] POST/GET run APIs with phase progress and daily idempotency
- [x] INE service with cache and null-safe parse
- [x] ADR + stub `PortalAdapter` + HTML fixtures
- [x] flags / umbral / renta / finanzas / link-verify
- [x] Report sections, empty/partial/stale, CSV, rerun

## Plan

1. Spec + flag + schemas.
2. Persistence + INE catalogue sync.
3. Entry UI (zones + params).
4. Async skeleton (steps + drain + recover).
5. Domain engine + stub listings.
6. Report + states.

## Decisions log

- 2026-08-27: namespace `/real-estate/screening` so equity `/screening` is untouched.
- 2026-08-27: user must choose (or confirm) parameters in the UI; defaults are pre-filled and summarised, never silent.
- 2026-08-27: production listing source is the stub adapter until the ADR is approved.

## Risks

- INE coverage gaps → disabled zones in the picker.
- Vercel timeout → short steps + recover cron.
- Portal ToS → no live scraping in production.

## Follow-ups

- Partner listing API or approved scrape.
- Map provider.
- Landing page when the flag goes broadly on.
