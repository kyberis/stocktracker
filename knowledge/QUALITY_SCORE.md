# QUALITY_SCORE.md — per-domain grades

Grades are a snapshot. Update them whenever a domain's shape changes. Keep the
table short; push detail into the individual product specs.

Scale: **A** = solid, tested, clean. **B** = works, a few known gaps.
**C** = works, meaningful debt. **D** = fragile, plan a refactor. **F** = broken.

| Domain | Grade | Why | Top debt |
|--------|------:|-----|----------|
| Auth & Identity | B | Sessions, passkeys, guards all covered; OAuth limited to admin paths. Unified IdP at user.trefolio.com lives behind `USE_LEGACY_AUTH` flag, with PKCE round-trip tested. | Cutover legacy code removal scheduled (7-day soak). Document the admin password reset path end-to-end. |
| Unified Accounts (IdP) | B | Trefolio / Clara / Will share one identity + Pro subscription via `user.trefolio.com`. Phase 0–6 shipped, Phase 7 hardening in progress. See [unified-accounts-and-billing](design-docs/unified-accounts-and-billing.md). | Cross-app log search + Playwright happy-path that talks to a real IdP test instance. |
| Portfolio Core | B | Holdings / transactions / cash well-tested; multi-portfolio is newer. | `derive-holdings` edge cases on partial sells and splits. |
| Market Data | B | Providers abstracted, Yahoo is the free backbone. | Yahoo rate-limit mitigation; FMP fallback matrix. |
| Dashboard & Charts | B | Chart code is clean; range/session logic is tested. | Mobile chart tooltip perf on 1Y+ ranges. |
| Crypto | C | Works via CoinLore; symbol mapping is fragile. | ISIN-less asset matching, thin tests. |
| Import & Brokers | B | 14 parsers with fixture tests. | New-broker onboarding docs; IBKR Flex rate limits. |
| SnapTrade | C | Sync cron reliable; UI for errors thin. | Surface partial-sync warnings to users. |
| AI Intelligence | C | Ships value; prompts duplicated. | Centralize prompt library; eval harness. |
| Tools | B | Rebalance and tax report are the stars. | Backtest perf on long histories. |
| Screener & Search | B | Cache refreshed nightly; explore search fast. | Screener universe size tracking. |
| Alerts & Goals | B | Dispatcher cron stable. | Whatsapp channel only partially shipped. |
| Notifications | B | In-app + push + device. | Push subscription cleanup. |
| Email & Digests | B | Resend, i18n templates, digests. | Unsubscribe link coverage across all email types. |
| Social | C | New; fewer tests, active iteration. | Moderation tooling, report flow. |
| Private Chat | C | Polling-based, 24h TTL. | Latency on typing indicators under load. |
| Sharing & Widgets | B | Public share pages working. | Widget theme parity and CSP. |
| Billing & Tiers | B | Stripe checkout + webhook reliable. | Refund-request UI polish. |
| Feature Flags | A | Simple, per-user, cached. | — |
| Admin | B | Comprehensive. | Consolidate nav; some sub-pages lag on design. |
| Analytics & Ads | B | Consent-gated. | AdSense slot validation. |
| Landing & Marketing | B | Many locales; blog indexed. | Landing rule enforcement lint. |
| Snapshots & Math | B | TTWROR/XIRR tested. | Backfill idempotency at scale. |
| Data Layer | B | Migrations numbered, tested. | Schema drift guard between Turso and local. |
| Cron & Reliability | B | Registry + logging in place. | SLO doc per cron. |
| Device (Leaf) | C | Functional; OTA tested. | Pairing UX on spotty Wi-Fi. |
| Mobile | B | Capacitor hosted-mode works. | Push entitlements on iOS. |
| Platform (i18n/theme/legal) | B | 35 locales, 4 themes. | Theme parity CI gate. |

## How to update

- When a spec moves a grade up or down, update this table in the same PR.
- When a row reaches **C or worse**, add a line to
  [`exec-plans/tech-debt-tracker.md`](exec-plans/tech-debt-tracker.md).
- The doc-gardener skill
  ([`.cursor/skills/doc-gardener/SKILL.md`](../.cursor/skills/doc-gardener/SKILL.md))
  scans this file for rows without a linked spec.

## Coverage targets

- Unit-test coverage ≥ 70% in `src/lib/**`.
- E2E smoke green for: signup → add holding → see chart → set alert → import CSV.
- Zero failing regression-tester runs before release (see
  [`.cursor/skills/regression-tester/SKILL.md`](../.cursor/skills/regression-tester/SKILL.md)).
