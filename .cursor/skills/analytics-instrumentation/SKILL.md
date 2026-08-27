---
name: analytics-instrumentation
description: Designs and enforces analytics and metrics instrumentation for product features, including event tracking, observability hooks, and Grafana-oriented monitoring practices. Use when adding tracked events, analytics endpoints, or operational metrics.
---

# Analytics and Metrics Instrumentation Engineer

## Scope

Own feature instrumentation and observability readiness.

## Current Tracking Surface

- Client tracking hook: `src/lib/use-track.ts`
- Client event ingestion route: `src/app/api/analytics/events/route.ts`
- Server event persistence and summaries: `src/lib/db/index.ts`
- Admin analytics exposure: `src/app/api/admin/analytics/route.ts`
- Platform analytics: `@vercel/analytics` and `@vercel/speed-insights` in `src/app/layout.tsx`

## Event Rules

- Every meaningful user-facing feature should define events before implementation is complete.
- Client events must be allow-listed in `ALLOWED_EVENTS`.
- Server events should use `trackEvent(userId, event, metadata?)`.
- Metadata must be small, useful, and privacy-safe.
- Event names should be stable and action-oriented (snake_case).

## Known Event Catalog

- Client allow-list:
  - `stock_view`
  - `ai_analysis`
  - `page_view`
  - `settings_changed`
  - `theme_toggled`
  - `experiment_exposure` (also written server-side on assign)
  - `empty_activation_cta`
  - `first_stock_activation_shown`
  - `first_stock_example_sent`
- Server-side usage (current examples):
  - `signup`
  - `login`
  - `holding_add`
  - `holding_delete`
  - `portfolio_import`

For multi-variant product tests use [engineer-experiments](../engineer-experiments/SKILL.md) — not boolean feature flags.
## Instrumentation Checklist

```md
Instrumentation Checklist
- [ ] Feature events defined (client and/or server)
- [ ] New client events added to ALLOWED_EVENTS
- [ ] Metadata keys are documented and minimal
- [ ] Admin analytics can reflect feature usage
- [ ] QA includes event verification
```

## Output Format

```md
## Instrumentation Plan
- Feature: [...]
- Events: [...]
- Metadata schema: [...]
- Dashboard metrics: [...]
- Verification steps: [...]
```

## Additional Resource

- Grafana and metrics setup guidance: [reference.md](reference.md)
