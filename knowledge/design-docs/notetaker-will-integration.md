# notetaker-will-integration

> Will (the note-taking assistant codebase, repo `kyberis/notetaker`) lives **inside trefolio** as a pinned git submodule at `external/notetaker`, but runs as a **separate Vercel deployment** at `will.trefolio.com`. Trefolio never builds Will; Will is independent of trefolio's product.

## Problem

Will is a sister project — a Telegram-first, MIT-licensed AI note-taking assistant — built and operated by the same maintainer as trefolio. The trefolio coding agent should be able to read Will's source as first-class context (so it can copy patterns, understand the agent loop, and pick up Telegram + GDPR + multilingual conventions consistently across the two products) without coupling deploys, leaking unrelated code into trefolio's bundle, or fighting two stacks at build time. This is the same problem already solved for [Clara](./etracker-clara-integration.md); Will follows the same playbook.

## Decision

1. **Will is enlisted as a git submodule** of trefolio at `external/notetaker`, pinned to a specific commit. Bumping the pin is an explicit, reviewable action.
2. **Trefolio's build/lint/test never touches Will.** The existing wildcard excludes for `external/**` in `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `.vercelignore`, and `.gitignore` automatically cover the new submodule.
3. **One repo = one Vercel project.** Trefolio deploys from `kyberis/stocktracker`. Will deploys from `kyberis/notetaker` to `will.trefolio.com`. The trefolio Vercel project keeps **Git Submodules disabled** so Vercel does not even attempt to clone Will (or Clara) during a trefolio deploy.
4. **Runtime integration via Agent Office.** Trefolio's `/office` feature calls Will over HTTP internal routes (`POST /api/internal/office/search-notes`, `POST /api/internal/office/log-note`) with `IDP_SERVICE_TOKEN` and the user's IdP identity. See [`agent-office.md`](../product-specs/agent-office.md).
5. **Read-only context for agents.** The trefolio coding agent may read `external/notetaker/**` to learn from Will, but must **not** modify it from this repo. Code changes to Will go in the `kyberis/notetaker` repo directly; trefolio only updates the pin.

## Why this and not X

| Alternative | Why rejected |
|---|---|
| **Copy/import Will into `src/`** | Forks the codebase. Defeats the goal of agents staying current with Will's real source. Doubles maintenance. |
| **Sibling clone in `~/notetaker`, no submodule** | Not portable, not pinned, invisible to anyone cloning trefolio fresh. Breaks core-belief #1 ("the repo is the memory"). |
| **Knowledge-base summary only, no code** | Loses fidelity. Agents end up guessing about Will's APIs. Drifts the moment Will changes. |
| **Monorepo (turborepo etc.)** | Premature. Will and trefolio ship independently and have different version cadences. |

Submodule with independent deploys gives us: real source as context, deterministic pin, zero build coupling, and optional runtime calls for Agent Office.

## How to follow it

### Initial clone

```bash
git clone https://github.com/kyberis/stocktracker.git
cd stocktracker
git submodule update --init --recursive   # pulls both Clara and Will
```

### Updating the pin

```bash
git submodule update --remote external/notetaker
git add external/notetaker
git -c commit.gpgsign=false commit --no-verify -m "chore: bump will pin"
```

Bump the pin when there's an interesting Will change to mirror in trefolio's agent context (e.g. new tool, new prompt, new GDPR pattern). Treat the pin like any other lockfile change.

### Reading Will as context (for agents)

- Free to read `external/notetaker/**`.
- Do **not** edit anything under `external/notetaker/`. If a Will change is needed, do it in the `kyberis/notetaker` repo and bump the pin here.
- Do **not** import from `external/notetaker/` in TypeScript — the path is excluded from `tsconfig.json` and there is no Will → trefolio module boundary by design.

## How to enforce it

### Build/test isolation (already in place — same as Clara)

| File | Guarantee |
|---|---|
| `[tsconfig.json](../../tsconfig.json)` | `external` in `exclude` — tsc/Next.js don't compile Will. |
| `[eslint.config.mjs](../../eslint.config.mjs)` | `external/**` in `globalIgnores` — lint skips Will. |
| `[vitest.config.ts](../../vitest.config.ts)` | `external/**` in `exclude` — unit tests skip Will. |
| `[.vercelignore](../../.vercelignore)` | `external/` ignored — Vercel CLI never uploads Will. |
| `[.gitignore](../../.gitignore)` | `external/**/node_modules`, `external/**/.next`, `external/**/.env*` not tracked from the parent repo. |

### Vercel project configuration (one-time, manual)

In the **trefolio** Vercel project:

1. **Settings → Git → Git Submodules: OFF.** Already required for Clara; the same setting covers Will. Vercel will not try to clone either submodule when deploying trefolio.

In the **Will** Vercel project (separate):

1. Linked to `kyberis/notetaker`, branch `main`.
2. Custom domain `will.trefolio.com` (CNAME / A record managed wherever `trefolio.com` is hosted).
3. Env vars from `external/notetaker/.env.example`. At a minimum: `DATABASE_URL` (Neon Postgres), `NEXTAUTH_URL=https://will.trefolio.com`, `NEXTAUTH_SECRET`, `OPENAI_API_KEY`, `CRON_SECRET`. Telegram, Google, Resend, Upstash, Blob, and Turnstile keys are optional but recommended in production.
4. **Settings → Crons** — three crons are declared in `external/notetaker/vercel.json`: `/api/cron/reminders` every minute, `/api/cron/account-purge` daily at 03:00, `/api/cron/deletion-reminders` daily at 09:00.

### Review checklist

When reviewing a PR that touches anything Will-adjacent in trefolio:

- [ ] No imports from `external/notetaker/` in trefolio source.
- [ ] No build config newly globbing `external/`.
- [ ] If `external/notetaker` pointer changed, the PR has an explicit "bump will pin" reason.
- [ ] If trefolio calls Will at runtime (Agent Office), verify `WILL_BASE_URL` + `IDP_SERVICE_TOKEN` and that identity is passed as `sub` + `email` — see [`agent-office.md`](../product-specs/agent-office.md).

## Open questions

- **Shared identity?** Resolved — Will, trefolio, and Clara will share an IdP at `user.trefolio.com`. See [unified-accounts-and-billing](unified-accounts-and-billing.md). Will becomes an OIDC client; user identity is the IdP `sub` claim.
- **Cross-promotion in dashboards?** Landing page markets Will as part of the three-agent ecosystem. Runtime integration is limited to Agent Office internal routes (`/api/internal/office/*`).

## Phase 2: IdP integration

After the unified accounts rollout (see [unified-accounts-and-billing](unified-accounts-and-billing.md) and the [exec plan](../exec-plans/active/unified-accounts.md)), Will becomes an OIDC client of the IdP at `user.trefolio.com`. Concrete change list lives at [will-idp-integration](will-idp-integration.md). Highlights:

- NextAuth providers reduce to a single `oidc` provider pointing at the IdP.
- `User.dailyAgentMessageLimit` is sourced from the JWT claim `entitlements.will_daily_limit` (free=30, pro=200).
- Will gains a structured 429 upsell payload from `consumeAgentQuota` so the upcoming web chat ships with paywall UX day one.
- Telegram `bot.quotaExceeded` strings include the IdP upgrade URL `https://user.trefolio.com/upgrade?from=will`.
- Marketing FAQ "Is there a paid tier?" is updated to reflect Trefolio Pro (€7.99/mo) unlocking 200/day on Will.
