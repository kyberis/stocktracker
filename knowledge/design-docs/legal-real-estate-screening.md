# Legal review — Real-estate zone screening (2026-08-27)

## Trigger

Displays investment-related analysis (cash-flow, yields, tax regimes) and persists user-selected zones plus run parameters (`re_screening_runs`). Fetches public INE statistics. Listing portals are stubbed; a live scrape would be a new third-party processor.

## Assessment

- **Not regulated advice** — report carries a full disclaimer (not financial / tax / real-estate advice; listings change daily; INE medians are not a property appraisal).
- **Data** — stored: `user_id`, selected `geocod`s, budget/mortgage params, analysis JSON. No new signup fields. INE receives no user identifiers (public indicator URLs only).
- **Third parties** — INE is a public statistics institute; no user PII sent. Idealista/other portals are **not** called in production (stub adapter). If a partner API is added later, update Privacy third-party table and this review.
- **AI** — v1 engine is deterministic (regex flags, INE math, mortgage formula). No new model prompts.
- **Cookies / payments / consent** — unchanged.

## Required before ship

- [x] Visible financial disclaimer on the report
- [x] Feature flag off by default
- [x] Portal scrape not enabled in production
- [x] Privacy: short mention that zone-screening runs and selected parameters are stored to deliver the report (see Privacy product-features list)

## Verdict

**Ship behind flag with disclaimers as implemented.** Re-review before enabling a live listing adapter.
