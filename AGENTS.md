# AGENTS.md — table of contents for agents

This file is intentionally short (~100 lines). It is a **map**, not an encyclopedia.
Its job is to tell an agent where to look next. When in doubt, follow the links.

> **Golden rule:** the repository is the system of record. Anything not discoverable
> from this repo effectively does not exist. Push context into the repo — not Slack,
> not chat threads, not your head.

## Product in one line

`trefolio` is a European, multi-currency, AI-powered portfolio tracker. Free /
Bifolio (€2.99) / Trefolio (€7.99) tiers. Next.js 14 App Router on Vercel, Turso
(libSQL), Stripe, Resend, SnapTrade, OpenAI, Yahoo/Alpha Vantage/FMP market data,
Capacitor for iOS/Android, plus a physical "trefolio Leaf" ESP32-S3 device.

## Where to look first

1. [`ARCHITECTURE.md`](ARCHITECTURE.md) — domain map, layering, permitted edges.
2. [`knowledge/product-specs/index.md`](knowledge/product-specs/index.md) — every
 feature, one spec per file. Start here when working on a specific capability.
3. [`knowledge/design-docs/index.md`](knowledge/design-docs/index.md) — core
 beliefs and cross-cutting patterns (EUR base currency, snapshots, demo mode,
 feature flags, broker parsers, AI streaming).
4. [`knowledge/QUALITY_SCORE.md`](knowledge/QUALITY_SCORE.md) — per-domain grades
 and known gaps. Read before making large changes.
5. [`knowledge/exec-plans/active/`](knowledge/exec-plans/active) — in-flight
 multi-step plans.
6. [`knowledge/design-docs/etracker-clara-integration.md`](knowledge/design-docs/etracker-clara-integration.md)
 — how trefolio links to Clara (the financial-agents sister codebase at
 `external/etracker`). Read before touching anything related to financial
 agents or `external/`.

## Repository layout (high level)

```
src/
  app/                Next.js App Router (pages + API routes)
    (app)/            Authenticated dashboard
    api/              REST endpoints (+ /api/cron/* for scheduled jobs)
  components/         React components
  contexts/           React contexts (currently: portfolio-command)
  hooks/              Reusable React hooks
  lib/
    api-providers/    Yahoo, Alpha Vantage, FMP, Finnhub, CoinLore, OpenFIGI
    auth/             Sessions, guards, passwords, passkeys
    broker-parsers/   14 CSV broker formats (DeGiro, IBKR, Trading212, ...)
    db/               Data access layer (one file per table/feature)
    email-i18n/       Localized email templates
  locales/            UI i18n (35 languages)
  middleware.ts       Auth + CSRF + security headers
scripts/              Build, migration, and maintenance scripts
lilygo-t4s3/          Device firmware (PlatformIO + LVGL) and SDL simulator
ios/ android/         Capacitor native shells
data/                 Seed + demo static JSON
docs/                 Marketing, launch, commercial plans (NOT agent knowledge)
knowledge/            Agent knowledge base (this is the system of record)
external/
  etracker/           Clara — financial-agents sister repo (kyberis/etracker),
                      pinned git submodule, READ-ONLY context for the agent.
                      Trefolio never builds it; calls it as separate Vercel
                      deploy via CLARA_BASE_URL. Excluded from tsconfig, eslint,
                      vitest, .vercelignore. See
                      knowledge/design-docs/etracker-clara-integration.md
.cursor/
  rules/              Cursor rules (always-applied)
  skills/             Expert skills by domain
```

## Operating principles (summary)

- Agent legibility beats human cleverness. Write code an agent can read and reason
  about. See [`knowledge/design-docs/core-beliefs.md`](knowledge/design-docs/core-beliefs.md).
- EUR is the base currency everywhere in storage. Display in user's preferred
  currency. See [`knowledge/design-docs/data-model-eur-base-currency.md`](knowledge/design-docs/data-model-eur-base-currency.md).
- Parse at the boundary with Zod. Never trust untyped data from providers.
- Feature flags gate anything experimental. See
  [`knowledge/design-docs/feature-flags-system.md`](knowledge/design-docs/feature-flags-system.md).
- Money is floating point in JS — always round at display time, never mid-calc.
  See [`knowledge/design-docs/index.md`](knowledge/design-docs/index.md).
- Cron jobs live in `src/app/api/cron/*` and MUST be registered in both
  [`src/lib/cron-registry.ts`](src/lib/cron-registry.ts) and `vercel.json`.
- Release notes entries are mandatory. See [`.cursor/rules/release-notes.mdc`](.cursor/rules/release-notes.mdc).
- Landing page and `/demo` must stay in sync with the dashboard. See
  [`.cursor/rules/landing-page.mdc`](.cursor/rules/landing-page.mdc) and
  [`.cursor/rules/demo-page.mdc`](.cursor/rules/demo-page.mdc).

## Operating process

- Write a plan for non-trivial work. Small plans: scratch notes.
  Larger plans: add to [`knowledge/exec-plans/active/`](knowledge/exec-plans/active)
  using [`knowledge/templates/exec-plan.template.md`](knowledge/templates/exec-plan.template.md).
- When you add a new feature, create its spec in
  [`knowledge/product-specs/`](knowledge/product-specs) using
  [`knowledge/templates/product-spec.template.md`](knowledge/templates/product-spec.template.md),
  and add it to the index. See [`.cursor/rules/knowledge-base.mdc`](.cursor/rules/knowledge-base.mdc).
- When you touch DB schema, crons, or feature flags, regenerate:
  `npm run knowledge:gen` — commits changes to `knowledge/generated/`.
- Lint the knowledge base before large commits: `npm run knowledge:lint`.

## Git discipline

- Bypass pre-commit/pre-push hooks and GPG signing: `git -c commit.gpgsign=false commit --no-verify -m "..."`
  and `git push --no-verify origin <branch>`. See [`.cursor/rules/git-push.mdc`](.cursor/rules/git-push.mdc).
- Do not push to `main` without a successful `npm run build && npm test`.

## Cross-references

- Skills (domain experts the agent can consult): [`.cursor/skills/`](.cursor/skills)
- Rules (always-applied guardrails): [`.cursor/rules/`](.cursor/rules)
- Release notes source of truth: [`src/lib/release-notes.ts`](src/lib/release-notes.ts)
- Seed data for onboarding / demo: [`data/`](data)
- Commercial + legal strategy: [`docs/COMMERCIALIZATION_PLAN.md`](docs/COMMERCIALIZATION_PLAN.md)

If this map is ever wrong, fix it. The map is part of the code.
