# curriculumsupport-renata-integration

> Renata (the AI curriculum/CV assistant codebase, repo `kyberis/curriculumsupport`) lives **inside trefolio** as a pinned git submodule at `external/curriculumsupport`, but runs as a **separate Vercel deployment**. Trefolio never builds Renata; Renata is independent of trefolio's product.

## Problem

Renata is a sister project — an AI-powered curriculum vitae assistant with Telegram integration, PDF generation, and web search — built and operated by the same maintainer as trefolio. The trefolio coding agent should be able to read Renata's source as first-class context (so it can copy patterns, understand the agent loop, and pick up AI SDK + Clerk + Telegram conventions consistently across products) without coupling deploys, leaking unrelated code into trefolio's bundle, or fighting two stacks at build time. This follows the same playbook established for [Clara](./etracker-clara-integration.md) and [Will](./notetaker-will-integration.md).

## Decision

1. **Renata is enlisted as a git submodule** of trefolio at `external/curriculumsupport`, pinned to a specific commit. Bumping the pin is an explicit, reviewable action.
2. **Trefolio's build/lint/test never touches Renata.** The existing wildcard excludes for `external/**` in `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `.vercelignore`, and `.gitignore` automatically cover the new submodule.
3. **One repo = one Vercel project.** Trefolio deploys from `kyberis/stocktracker`. Renata deploys from `kyberis/curriculumsupport` to its own domain. The trefolio Vercel project keeps **Git Submodules disabled** so Vercel does not even attempt to clone Renata during a trefolio deploy.
4. **No runtime integration in v1.** Trefolio does not call Renata from code today. Renata is included purely as agent context — same reasoning as Will.
5. **Read-only context for agents.** The trefolio coding agent may read `external/curriculumsupport/**` to learn from Renata, but must **not** modify it from this repo. Code changes to Renata go in the `kyberis/curriculumsupport` repo directly; trefolio only updates the pin.

## Why this and not X

| Alternative | Why rejected |
|---|---|
| **Copy/import Renata into `src/`** | Forks the codebase. Defeats the goal of agents staying current with Renata's real source. Doubles maintenance. |
| **Sibling clone in `~/curriculumsupport`, no submodule** | Not portable, not pinned, invisible to anyone cloning trefolio fresh. Breaks core-belief #1 ("the repo is the memory"). |
| **Knowledge-base summary only, no code** | Loses fidelity. Agents end up guessing about Renata's APIs. Drifts the moment Renata changes. |
| **Monorepo (turborepo etc.)** | Premature. Renata and trefolio ship independently and have different version cadences. |

Submodule with no runtime coupling gives us: real source as context, deterministic pin, zero build coupling, independent deploys.

## How to follow it

### Initial clone

```bash
git clone https://github.com/kyberis/stocktracker.git
cd stocktracker
git submodule update --init --recursive   # pulls Clara, Will, accounts, and Renata
```

### Updating the pin

```bash
git submodule update --remote external/curriculumsupport
git add external/curriculumsupport
git -c commit.gpgsign=false commit --no-verify -m "chore: bump renata pin"
```

Bump the pin when there's an interesting Renata change to mirror in trefolio's agent context (e.g. new tool, new prompt, new AI pattern). Treat the pin like any other lockfile change.

### Reading Renata as context (for agents)

- Free to read `external/curriculumsupport/**`.
- Do **not** edit anything under `external/curriculumsupport/`. If a Renata change is needed, do it in the `kyberis/curriculumsupport` repo and bump the pin here.
- Do **not** import from `external/curriculumsupport/` in TypeScript — the path is excluded from `tsconfig.json` and there is no Renata → trefolio module boundary by design.

## How to enforce it

### Build/test isolation (already in place — same as other submodules)

| File | Guarantee |
|---|---|
| `[tsconfig.json](../../tsconfig.json)` | `external` in `exclude` — tsc/Next.js don't compile Renata. |
| `[eslint.config.mjs](../../eslint.config.mjs)` | `external/**` in `globalIgnores` — lint skips Renata. |
| `[vitest.config.ts](../../vitest.config.ts)` | `external/**` in `exclude` — unit tests skip Renata. |
| `[.vercelignore](../../.vercelignore)` | `external/` ignored — Vercel CLI never uploads Renata. |
| `[.gitignore](../../.gitignore)` | `external/**/node_modules`, `external/**/.next`, `external/**/.env*` not tracked from the parent repo. |

### Vercel project configuration (one-time, manual)

In the **trefolio** Vercel project:

1. **Settings → Git → Git Submodules: OFF.** Already required for other submodules; the same setting covers Renata. Vercel will not try to clone any submodule when deploying trefolio.

In the **Renata** Vercel project (separate):

1. Linked to `kyberis/curriculumsupport`, branch `main`.
2. Custom domain (e.g. `renata.trefolio.com` or standalone).
3. Env vars from `external/curriculumsupport/.env.example`:
   - **Clerk**: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Neon**: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`
   - **Vercel Blob**: `BLOB_READ_WRITE_TOKEN`
   - **AI Gateway**: `VERCEL_OIDC_TOKEN` (auto-provisioned)
   - **Tavily**: `TAVILY_API_KEY` (optional, for web search)
   - **Telegram**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`
   - **Donations**: `NEXT_PUBLIC_BTC_ADDRESS`, `NEXT_PUBLIC_ETH_ADDRESS`

### Review checklist

When reviewing a PR that touches anything Renata-adjacent in trefolio:

- [ ] No imports from `external/curriculumsupport/` in trefolio source.
- [ ] No build config newly globbing `external/`.
- [ ] If `external/curriculumsupport` pointer changed, the PR has an explicit "bump renata pin" reason.
- [ ] If trefolio ever starts calling Renata at runtime (not the plan in v1), this triggers the `[legal-advisor](../../.cursor/skills/legal-advisor/SKILL.md)` skill (new third-party processor + data path).

## Open questions

- **Shared identity?** Renata uses Clerk for auth. Future phase may integrate with the unified IdP at `user.trefolio.com` if cross-product identity becomes valuable.
- **Cross-promotion?** May add Renata to the trefolio ecosystem marketing alongside Warren / Clara / Will in a future phase.

## Tech stack summary

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth | Clerk |
| Database | Neon Postgres + Drizzle ORM |
| AI | Vercel AI SDK, AI Gateway |
| PDF | @react-pdf/renderer |
| Telegram | Bot integration |
| File storage | Vercel Blob |
| Web search | Tavily |
