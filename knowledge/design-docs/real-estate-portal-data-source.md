# ADR: listing data source for real-estate zone screening

- **Status:** accepted for v1 (stub only) — live portal access is **not** approved
- **Date:** 2026-08-27
- **Deciders:** product owner (pending for options b/c)

## Context

The zone-screening engine needs sale listings (price, m², description, URL) and rent comparables. The original spec learned Idealista URL patterns and CSS selectors from a manual run. Shipping server-side scraping of a commercial portal is a different legal and operational act: terms of service, anti-bot, rate limits, and volume.

## Options

| Option | Summary | Pros | Cons |
|--------|---------|------|------|
| (a) Partner API / licensed feed | Official Idealista (or other) API | ToS-clean, stable schema | Cost, contract, coverage |
| (b) User-session on-demand | User's own browser session / cookies | User is the request origin | Fragile, support burden, still ToS-grey |
| (c) Server scrape + cache | Fetch HTML from trefolio servers, 1–1.5s delay, daily cache | Matches the manual run | ToS risk, selector rot, blocks, legal review |

## Decision (v1)

**Use (a) as the target.** Until a contract exists, production uses `StubPortalAdapter` (`src/lib/real-estate-screening/services/portal.ts`) fed by HTML fixtures. The `PortalAdapter` interface stays stable so (a) or a later approved (c) can land without touching finance/flags/report.

**Do not deploy (c) to production without explicit owner approval.**

## Consequences

- Reports in production show fixture/stub listings when the INE phase succeeds and the listing phase runs the stub.
- Selector validation still exists against fixtures so a future Idealista adapter fails tests, not silently empty datasets.
- Cache table `re_listing_cache` is ready for a licensed feed's JSON payloads.

## Follow-up

Re-open this ADR when a partner API is available, or if the owner explicitly approves a rate-limited scrape with legal sign-off.
