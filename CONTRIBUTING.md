# Contributing to trefolio

Thank you for your interest in contributing! trefolio is a European multi-currency portfolio tracker built on Next.js. This guide will get you up and running.

## Table of contents

- [Getting started](#getting-started)
- [Development workflow](#development-workflow)
- [Codebase orientation](#codebase-orientation)
- [Submitting changes](#submitting-changes)
- [Code standards](#code-standards)
- [Reporting bugs](#reporting-bugs)

---

## Getting started

### Prerequisites

- **Node.js ≥ 22** (check with `node -v`; pin is `22` in [`.nvmrc`](.nvmrc) / [`.node-version`](.node-version) — use `nvm use`, `fnm use`, or put `node@22` first on your `PATH`)
- **npm ≥ 10**
- A [Turso](https://turso.tech) database (free tier works) or a local `libsql` file

### Setup

```bash
git clone https://github.com/kyberis/stocktracker.git
cd stocktracker
npm install
cp .env.local.example .env.local
# Fill in the required env vars — see .env.local.example for guidance
npm run db:migrate
npm run dev
```

The app runs at `http://localhost:3000`.

### Optional: Clara (financial-agents submodule)

trefolio uses [Clara](https://github.com/kyberis/etracker) as a companion AI agent. It's included as a git submodule but **not required** for most frontend/backend work:

```bash
git submodule update --init
cd external/etracker && npm install
```

### Optional: cursor-plugins (Marketplace bundle submodule)

The [cursor-plugins](https://github.com/kyberis/cursor-plugins) repo (Cursor rules/skills/agents for open publication) is a **submodule** at `cursor-plugins/`. It is not used by the Next.js build. To fetch it:

```bash
git submodule update --init cursor-plugins
```

A full clone with all submodules: `git clone --recurse-submodules https://github.com/kyberis/stocktracker.git` (then `git submodule update --init --recursive` if you add more later).

---

## Development workflow

```bash
npm run dev          # start Next.js dev server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit tests
npm run build        # production build (run before opening a PR)
```

Before pushing to `main`, confirm all four pass:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

---

## Codebase orientation

The most important entry points:

| Path | What lives there |
|------|-----------------|
| `AGENTS.md` | Map of the whole repo — start here |
| `ARCHITECTURE.md` | Domain map and permitted code edges |
| `knowledge/product-specs/` | One spec per feature |
| `knowledge/design-docs/` | Cross-cutting patterns (data model, demo mode, feature flags) |
| `src/lib/db/` | Data access layer (Turso/libSQL) |
| `src/app/(app)/` | Authenticated dashboard pages |
| `src/app/api/` | REST API routes |
| `src/components/` | Shared React components |

---

## Submitting changes

1. Fork the repo and create a feature branch (`git checkout -b feat/my-feature`).
2. Make your changes. Add/update tests where relevant.
3. Add a release note entry in `src/lib/release-notes.ts` for user-visible changes.
4. Run the full check suite (see above).
5. Open a pull request against `main`. Fill out the PR template.

**Small, focused PRs** are much easier to review than large ones. If you're working on something big, open a draft PR early to discuss the approach.

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dark-mode toggle to settings
fix: correct GBX → GBP conversion factor
docs: update broker parser list in README
```

---

## Code standards

- **TypeScript strict** — no `any`, parse at boundaries with Zod.
- **EUR base currency** — all monetary storage in EUR; display in user's preferred currency. See `knowledge/design-docs/data-model-eur-base-currency.md`.
- **No hardcoded secrets** — use `process.env.*`; document new variables in `.env.local.example`.
- **Feature flags** — gate experimental features; see `knowledge/design-docs/feature-flags-system.md`.
- **Release notes** — every user-visible change needs an entry in `src/lib/release-notes.ts`.
- **i18n** — new UI strings go into `src/lib/locales/en.json` (and `es.json` at minimum).

---

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug.md) on GitHub Issues. Include reproduction steps, expected vs actual behaviour, and your browser/OS.

For security vulnerabilities, see [SECURITY.md](SECURITY.md) — do **not** open a public issue.
