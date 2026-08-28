# Product-specs index

One spec per feature. Each file follows
[`../templates/product-spec.template.md`](../templates/product-spec.template.md).

Organized by domain; domains match [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md).

> The linter (`npm run knowledge:lint`) requires every API route under
> `src/app/api/**` to be referenced by at least one spec. If you add a route,
> add or update a spec.

> **Note:** this catalog is alphabetical within each domain and only lists specs
> that actually exist on disk. If a feature is missing a dedicated spec here, it
> is either:
> 1. A generated doc (see `../generated/`),
> 2. A known gap tracked in [`../exec-plans/tech-debt-tracker.md`](../exec-plans/tech-debt-tracker.md),
>    or
> 3. A candidate for the [`doc-gardener`](../../.cursor/skills/doc-gardener/SKILL.md)
>    skill — see the **Backlog** section at the bottom.

## Auth & Identity

- [accounts-profile](accounts-profile.md) — profile settings, locale, currency.
- [auth-change-password](auth-change-password.md) — password change flow.
- [auth-login-signup](auth-login-signup.md) — password login, OAuth, email sign up.
- [auth-passkeys](auth-passkeys.md) — WebAuthn registration + signin.
- [auth-verify-email](auth-verify-email.md) — email verification flow.
- [impersonation](impersonation.md) — admin user-impersonation mode.
- [membership-grant](membership-grant.md) — admin grants of Pro access.
- [ops-telegram-agent](ops-telegram-agent.md) — staff ops Telegram bot + IdP digest + internal metrics fan-out.
- [portfolio-anomaly-agent](portfolio-anomaly-agent.md) — hybrid portfolio data-anomaly scan + admin/Telegram triage.
- [referral](referral.md) — referral codes + reward tracking.
- [lifecycle-emails](lifecycle-emails.md) — daily merged trial-invite + activation + winback cron.
- [trial-invitations](trial-invitations.md) — eligibility cron + email invite.
- [trial-system](trial-system.md) — Pro trial invitations + expiration.
- [unified-accounts-admin](unified-accounts-admin.md) — single-pane admin UI for IdP users + linked products.
- [unified-accounts-idp](unified-accounts-idp.md) — single sign-on + Pro across trefolio, Clara, Will via `user.trefolio.com`.
- [idp-personal-access-tokens](idp-personal-access-tokens.md) — PAT minting, introspection, and MCP bearer contract on the IdP.

## Portfolio Core

- [advanced-investor-dashboard](advanced-investor-dashboard.md) — AID beta control panel (`/aid`), home CTA, Warren/Will/Clara column.
- [agent-dock](agent-dock.md) — Global Warren/Clara dock (desktop expanded, mobile FAB → sheet).
- [clara-home-cta](clara-home-cta.md) — Home money desk (Warren × Clara): pulse, onboarding, empty states; Classic/mobile still use the Clara card + modal.
- [agent-board-pizarra](agent-board-pizarra.md) — Opt-in Scriptable Pizarra: Warren/Clara AI proactive messages (news, movers, catalysts, alerts, Clara savings).
- [unified-homepage](unified-homepage.md) — Default daily home at `/` (`home_v2` on by default); Classic at `/classic` (`classic_home`).
- [home-portfolio-recommendations](home-portfolio-recommendations.md) — Home tip card queue + diversify sector research.
- [accounts-manager](accounts-manager.md) — user-visible accounts/brokers.
- [cash-balances](cash-balances.md) — multi-currency cash entries.
- [derive-holdings](derive-holdings.md) — pure function: transactions → holdings.
- [global-portfolio-selector](global-portfolio-selector.md) — dashboard portfolio switcher.
- [holdings-crud](holdings-crud.md) — add/edit/remove holdings.
- [mutual-funds](mutual-funds.md) — mutual fund (fondos) asset type.
- [manual-assets](manual-assets.md) — non-listed assets (real estate, etc.).
- [fixed-return-investments](fixed-return-investments.md) — custom fixed-return positions with linear accrual.
- [portfolio-context-demo-mode](portfolio-context-demo-mode.md) — `PortfolioProvider` and `demoMode`.
- [portfolios-multi](portfolios-multi.md) — retired; single portfolio per user (Free + Pro).
- [transactions](transactions.md) — transaction ledger and derivation.

## Snapshots & Math

- [backfill-snapshots](backfill-snapshots.md) — recompute historical snapshots.
- [compact-snapshots](compact-snapshots.md) — prune old high-resolution data.
- [display-invariants](display-invariants.md) — home display-number consistency checks + sampled telemetry.
- [materialize-portfolio-snapshots](materialize-portfolio-snapshots.md) — per-holding expansion for charts.
- [portfolio-snapshots-cron](portfolio-snapshots-cron.md) — daily snapshot writer.
- [portfolio-summary-math](portfolio-summary-math.md) — totals/shares/breakdowns.
- [ttwror-xirr-performance](ttwror-xirr-performance.md) — time-weighted + IRR performance metrics.

## Market Data

- [economic-indicators](economic-indicators.md) — CPI, rates, etc. on the dashboard.
- [event-calendar](event-calendar.md) — earnings/ex-div calendar UI.
- [ex-dividend-calendar](ex-dividend-calendar.md) — upcoming ex-dividend dates.
- [exchange-rates](exchange-rates.md) — FX cache and conversion.
- [fundamentals](fundamentals.md) — balance sheet + income statement cache.
- [historical-prices](historical-prices.md) — OHLC history cache.
- [market-insights](market-insights.md) — curated market highlights feed.
- [market-move-toast](market-move-toast.md) — live market move notifications.
- [market-ticker-bar](market-ticker-bar.md) — global top-of-page ticker strip (app, demo, and public landing).
- [quotes-provider-abstraction](quotes-provider-abstraction.md) — Yahoo/AV/FMP/CoinLore unified.

## Dashboard

- [crypto-portfolio-tab](crypto-portfolio-tab.md) — crypto view inside dashboard.
- [dashboard-shell](dashboard-shell.md) — the top-level dashboard container.
- [dashboard-tabs](dashboard-tabs.md) — tabbed navigation within the dashboard.
- [dashboard-toolbar](dashboard-toolbar.md) — toolbar with filters + portfolio selector.
- [jobs-nav](jobs-nav.md) — command-strip goal switcher (Add / Review / Discover) behind `jobs_nav`.
- [growth-tab](growth-tab.md) — projected-growth tab.
- [market-and-cash](market-and-cash.md) — market / cash summary widget.
- [metrics-tab](metrics-tab.md) — KPI metrics tab.

## Charts

- [benchmark-overlay](benchmark-overlay.md) — compare against S&P/MSCI overlays.
- [chart-ai-chat-panel](chart-ai-chat-panel.md) — AI panel docked in the chart.
- [chart-tooltip](chart-tooltip.md) — hover tooltip with derived data.
- [market-session-rendering](market-session-rendering.md) — pre/post/open session shading.
- [portfolio-value-chart](portfolio-value-chart.md) — interactive evolution chart on `/portfolio`.
- [portfolio-performance-matrix](portfolio-performance-matrix.md) — hero performance table by asset class and period.
- [range-selector](range-selector.md) — 1D/1W/1M/1Y selector.
- [spike-attribution](spike-attribution.md) — explain which holding caused a move.

## Crypto

- [add-crypto-modal](add-crypto-modal.md) — crypto add-holding modal.
- [crypto-market](crypto-market.md) — crypto market prices page.
- [crypto-page](crypto-page.md) — dedicated `/crypto` section.

## AI Features

- [ai-analysis](ai-analysis.md) — per-holding AI analysis panel.
- [ai-compare](ai-compare.md) — compare two stocks with AI.
- [ai-import-assist](ai-import-assist.md) — AI fallback that extracts transactions from text.
- [ai-models-registry](ai-models-registry.md) — registered models + admin selection.
- [ai-stream](ai-stream.md) — streaming AI helper.
- [moat-auto-tickers](moat-auto-tickers.md) — moat evaluation queue.
- [moat-reports](moat-reports.md) — long-form moat grading.
- [moat-screener](moat-screener.md) — filter screener by moat.
- [portfolio-review](portfolio-review.md) — AI portfolio review.
- [stock-evaluation](stock-evaluation.md) — rules + AI valuation.
- [company-analysis](company-analysis.md) — `/analisis` multi-section company report (fundamentals, technicals, news, Form 4, Congress).
- [etf-analysis](etf-analysis.md) — same `/analisis/[ticker]` URL; ETF/ETP fund profile (facts + holdings) instead of company EPS/insiders.
- [warren-investing-knowledge](warren-investing-knowledge.md) — curated investing-concepts library exposed to Warren as a tool.
- [warren-valuation](warren-valuation.md) — share-level fundamentals cache + cheap/fair/expensive label for Warren.
- [warren-empty-add-stock](warren-empty-add-stock.md) — empty-portfolio Warren: add-stock + import picker (same `/import` wizard) + 10-chat / 15-min cooldown.
- [warren-first-stock](warren-first-stock.md) — A/B post-onboarding skip: control empty home vs right Warren with a prefilled first-stock example.
- [warren-import](warren-import.md) — import CSV / SnapTrade / AI through Warren using the same `/import` pipelines.
- [warren-telegram-bot](warren-telegram-bot.md) — Warren accessible via Telegram (text + voice).
- [clover-assistant](clover-assistant.md) — Clover default orchestrator (Warren + Clara behind the scenes; Telegram @cloveraiassistant_bot).
- [agent-office](agent-office.md) — Pro workspace where Warren, Clara, and Will coordinate missions (`/office`).
- [investment-screening](investment-screening.md) — `/screening` exposure → intake chat → brief → run → HTML candidate report (flag `investment_screening_enabled`, stage E0 fixture).
- [real-estate-screening](real-estate-screening.md) — Portugal zone screening at `/real-estate/screening` (INE catalogue + user params; flag `real_estate_screening_enabled`).
- [trefolio-mcp-user](trefolio-mcp-user.md) — HTTP MCP read API for portfolio data (`tfp_pat_` via IdP).

## Tools

- [backtest-whatif](backtest-whatif.md) — historical "what if" backtests.
- [explore-asset-search](explore-asset-search.md) — asset search widget.
- [favorite-tools](favorite-tools.md) — pinned tools bar.
- [financial-planning](financial-planning.md) — long-term planning calculator.
- [global-search](global-search.md) — cmd-K palette.
- [net-worth-tracking](net-worth-tracking.md) — combined net worth view.
- [rebalance-targets](rebalance-targets.md) — allocation targets + suggested trades.
- [holdings-explorer](holdings-explorer.md) — sort your own holdings by P/E, yield, weight, sector.
- [real-estate-screening](real-estate-screening.md) — Portugal zone screening: INE prices + cash-flow report (`/real-estate/screening`).
- [stock-screener](stock-screener.md) — 600-stock filter UI.
- [strategies](strategies.md) — saved investment ideas + auto-alerts.
- [tax-reports](tax-reports.md) — year-end tax reports per country.
- [tools-index](tools-index.md) — `/tools` hub page + favorites.
- [warren-screener](warren-screener.md) — value-style moat list (low P/E, cap limit).

## Import & Brokers

- [broker-integration-requests](broker-integration-requests.md) — vote for new brokers.
- [broker-parsers](broker-parsers.md) — CSV/PDF broker parsers.
- [ibkr-flex](ibkr-flex.md) — Flex query token import.
- [myinvestor-import](myinvestor-import.md) — MyInvestor / Inversis Excel operations import.
- [import-hub](import-hub.md) — unified `/import` page.
- [import-data-quality](import-data-quality.md) — market cross-check + auto-repair on import / existing holdings.
- [snaptrade-import](snaptrade-import.md) — OAuth broker connections.
- [broker-mark-reconciliation](broker-mark-reconciliation.md) — SnapTrade last vs market last; Home banner + in-app notify.
- [trade-republic-import](trade-republic-import.md) — Trade Republic CSV + flag-gated broker picker.

## Alerts & Notifications

- [alerts](alerts.md) — price/news/earnings/AI alerts.
- [daily-market-digest](daily-market-digest.md) — opt-in daily market email.
- [email-system](email-system.md) — Resend-backed transactional + marketing email.
- [admin-email-flows](admin-email-flows.md) — admin map of email automations (also under Admin).
- [goals](goals.md) — target-value goals.
- [notifications-inapp](notifications-inapp.md) — in-app bell + drawer.
- [push-notifications](push-notifications.md) — web + native push.
- [watchlist](watchlist.md) — tickers to track without owning.
- [weekly-digest](weekly-digest.md) — Sunday portfolio email.

## Social & Chat

- [chat-portfolio-share](chat-portfolio-share.md) — share portfolio cards in chat.
- [connections](connections.md) — follow/connect users.
- [network-feed](network-feed.md) — timeline from followed users.
- [people-search](people-search.md) — search users.
- [private-chat](private-chat.md) — 1:1 chat with 24h TTL.
- [public-profile-seo](public-profile-seo.md) — SEO metadata for `/u/:handle`.
- [social-posts](social-posts.md) — rich-content posts.
- [social-profiles](social-profiles.md) — public `/u/:handle` profiles.
- [support-chat](support-chat.md) — user-to-support chat.

## Billing & Feature Flags

- [billing-portal](billing-portal.md) — Stripe customer portal link.
- [feature-flags](feature-flags.md) — per-user flag system.
- [experiments](experiments.md) — first-party sticky A/B/C experiments + admin live metrics.
- [paywall](paywall.md) — tier gating on Pro features.
- [refund-requests](refund-requests.md) — refund flow.
- [stripe-checkout](stripe-checkout.md) — checkout session creation.
- [stripe-webhook](stripe-webhook.md) — webhook reconciliation.
- [subscription-tiers](subscription-tiers.md) — tier and feature registry.
- [subscription-model-v2](subscription-model-v2.md) — universal-access quotas (current model).

## Admin

- [admin-ai-logs](admin-ai-logs.md) — AI usage + cost logs.
- [admin-analytics](admin-analytics.md) — internal analytics dashboards.
- [admin-engagement-report](admin-engagement-report.md) — HTML engagement report + confirm-to-send survey campaigns.
- [admin-cron-stats](admin-cron-stats.md) — cron observability.
- [admin-email-flows](admin-email-flows.md) — read-only email automation map.
- [admin-feature-flags](admin-feature-flags.md) — manage flags.
- [experiments](experiments.md) — A/B/C experiment admin (also under Billing & Feature Flags).
- [admin-panel](admin-panel.md) — `/admin` index.
- [admin-sub-tools](admin-sub-tools.md) — thin specs for remaining admin tools.
- [admin-users](admin-users.md) — user admin + impersonation.

## Landing, Marketing, SEO & Analytics

- [ads](ads.md) — Free-tier ad slots.
- [analytics-events](analytics-events.md) — custom event pipeline.
- [blog](blog.md) — `/blog` content pages.
- [cookies-consent](cookies-consent.md) — GDPR cookie banner.
- [demo-page](demo-page.md) — `/demo` live dashboard.
- [device-interest](device-interest.md) — Leaf waitlist.
- [feedback](feedback.md) — in-app feedback.
- [landing](landing.md) — `/landing` homepage.
- [onboarding](onboarding.md) — first-time flow.
- [pricing](pricing.md) — pricing section + `/pricing`.
- [seo-metadata](seo-metadata.md) — sitemap/robots/llms.txt.
- [studio-hub](studio-hub.md) — `/studio` public AI agents studio hub (Warren, Clara, Will, Renata, Roxana).

## Platform

- [i18n](i18n.md) — locale and translations.
- [legal-pages](legal-pages.md) — privacy, terms, disclaimer.
- [platform-cron-system](platform-cron-system.md) — cron registry + runner.
- [platform-data-layer](platform-data-layer.md) — Turso / libSQL layer.
- [release-process](release-process.md) — versioning + release notes.
- [theming](theming.md) — light/dark theme.
- [widgets-developer-console](widgets-developer-console.md) — developer console + embeds.

## Device & Mobile

- [capacitor-mobile](capacitor-mobile.md) — iOS + Android shell.
- [device-firmware-ota](device-firmware-ota.md) — firmware OTA updates.
- [device-lvgl-ui](device-lvgl-ui.md) — LVGL-based device UI.
- [pwa](pwa.md) — progressive web app + service worker.
- [scriptable-home-widgets](scriptable-home-widgets.md) — iOS Scriptable widgets (portfolio + top movers).
- [sdl-simulator](sdl-simulator.md) — desktop device simulator.
- [trefolio-leaf-device](trefolio-leaf-device.md) — Leaf device page + provisioning.

## Backlog — gaps for doc-gardener

Domains are considered well-covered today (see counts in
[`../QUALITY_SCORE.md`](../QUALITY_SCORE.md)). Known thin spots worth a future
pass by [`doc-gardener`](../../.cursor/skills/doc-gardener/SKILL.md) or a
domain engineer:

- **Import & Brokers** — candidates still thin: Bitpanda, Plus500, Freedom24,
  XTB. Covered: [broker-parsers](broker-parsers.md),
  [myinvestor-import](myinvestor-import.md), [import-hub](import-hub.md),
  [trade-republic-import](trade-republic-import.md).
- **AI** — prompt/response schema docs per AI endpoint; today only feature-level
  specs exist (`ai-analysis`, `ai-compare`, etc.). Consider extracting a
  `ai-prompts-registry` spec from the code in `src/lib/ai-prompts.ts`.
- **Billing** — `stripe-webhook` covers the reconciler but individual event
  handlers (`customer.subscription.*`, `invoice.*`) are not documented.
- **Chat** — typing indicator, presence, and read-receipt specs are folded into
  `private-chat`; splitting them out would match the file layout in
  `src/lib/db/chat-*.ts`.

When filling a gap, use
[`../templates/product-spec.template.md`](../templates/product-spec.template.md)
and add the new entry to the appropriate domain section above.
