# etracker-clara-integration

> Clara (the financial-agents codebase, repo `kyberis/etracker`) lives **inside trefolio** as a pinned git submodule at `external/etracker`, but runs as a **separate Vercel deployment**. Trefolio never builds Clara; trefolio calls Clara over HTTP/MCP.

## Problem

We are starting to build financial agents in trefolio (portfolio-aware AI flows that go beyond today's per-stock analysis). Most of the agentic substrate already exists in a sister project — **Clara**, hosted at [kyberis/etracker](https://github.com/kyberis/etracker), also Next.js + Prisma. We want trefolio's coding agent to read Clara's source as first-class context (so it can copy patterns, understand the agent loop, integrate cleanly), without coupling deploys, leaking private code into trefolio's bundle, or fighting two stacks at build time.

## Decision

1. **Clara is enlisted as a git submodule** of trefolio at `external/etracker`, pinned to a specific commit. Bumping the pin is an explicit, reviewable action.
2. **Trefolio's build/lint/test never touches Clara.** Excludes are configured in `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `.vercelignore`, and `.gitignore`.
3. **One repo = one Vercel project.** Trefolio deploys from `kyberis/stocktracker`. Clara deploys from `kyberis/etracker`. The trefolio Vercel project has **Git Submodules disabled** so Vercel does not even attempt to clone Clara during a trefolio deploy.
4. **Integration shape is "external service".** When the financial agents in trefolio need Clara, they call Clara over HTTP (or MCP), parameterised by `CLARA_BASE_URL`. Clara is **not** imported as a library.
5. **Read-only context for agents.** The trefolio coding agent may read `external/etracker/**` to learn from Clara, but must **not** modify it from this repo. Code changes to Clara go in the `kyberis/etracker` repo directly; trefolio only updates the pin.

## Why this and not X

| Alternative | Why rejected |
|---|---|
| **Copy/import Clara into `src/`** | Forks the codebase. Defeats the goal of agents staying current with Clara's real source. Doubles maintenance. |
| **Sibling clone in `~/etracker`, no submodule** | Not portable, not pinned, invisible to anyone cloning trefolio fresh. Breaks core-belief #1 ("the repo is the memory"). |
| **Knowledge-base summary only, no code** | Loses fidelity. Agents end up guessing about Clara's API. Drifts the moment Clara changes. |
| **Monorepo (turborepo etc.)** | Premature. Forces a build-system migration on trefolio for a sister project that ships independently. |

Submodule + service-call gives us: real source as context, deterministic pin, zero build coupling, independent deploys.

## How to follow it

### Local dev — running trefolio + Clara together

Trefolio runs on **3000**, Clara on **3100**. Scripts are in `[package.json](../../package.json)`:

```bash
git submodule update --init external/etracker
npm run clara:install                 # installs deps inside external/etracker (isolated node_modules)
cp external/etracker/.env.example external/etracker/.env  # then fill in values for Clara's own DB/keys
npm run dev:all                       # runs both apps concurrently
```

Once running, trefolio code that needs Clara reads `process.env.CLARA_BASE_URL` (default `http://localhost:3100` — see `.env.local.example`).

### Updating the pin

```bash
npm run clara:update   # = git submodule update --remote external/etracker
git add external/etracker
git -c commit.gpgsign=false commit --no-verify -m "chore: bump clara pin"
```

Bump the pin only when trefolio actually depends on a new Clara feature, or as a routine refresh. Treat the pin like any other lockfile change.

### Calling Clara from trefolio code

When the financial agents land, the canonical pattern is:

```ts
const base = process.env.CLARA_BASE_URL;
if (!base) throw new Error("CLARA_BASE_URL not configured");
const res = await fetch(`${base}/api/agents/...`, { method: "POST", body: JSON.stringify(input) });
```

Server-side only. Never leak `CLARA_BASE_URL` to the client.

### Reading Clara as context (for agents)

- Free to read `external/etracker/**`.
- Do **not** edit anything under `external/etracker/`. If a Clara change is needed, do it in the `kyberis/etracker` repo and bump the pin here.
- Do **not** import from `external/etracker/` in TypeScript — the path is excluded from `tsconfig.json` and there is no Clara → trefolio module boundary by design.

## How to enforce it

### Build/test isolation (already in place)

| File | Guarantee |
|---|---|
| `[tsconfig.json](../../tsconfig.json)` | `external` in `exclude` — tsc/Next.js don't compile Clara. |
| `[eslint.config.mjs](../../eslint.config.mjs)` | `external/**` in `globalIgnores` — lint skips Clara. |
| `[vitest.config.ts](../../vitest.config.ts)` | `external/**` in `exclude` — unit tests skip Clara. |
| `[.vercelignore](../../.vercelignore)` | `external/` ignored — Vercel CLI never uploads Clara. |
| `[.gitignore](../../.gitignore)` | `external/**/node_modules`, `external/**/.next`, `external/**/.env*` not tracked from the parent repo. |

### Vercel project configuration (one-time, manual)

In the trefolio Vercel project:

1. **Settings → Git → Git Submodules: OFF.** Vercel won't try to clone the private `etracker` submodule when deploying trefolio. (Required: without this, deploys would either fail on auth or pointlessly drag Clara's source into the build context.)
2. Confirm Clara has its own Vercel project linked to `kyberis/etracker` with its own env vars. That project owns Clara's deploys end-to-end.

In Clara's Vercel project:

- Production URL goes into trefolio's `CLARA_BASE_URL` env var (Settings → Environment Variables) when trefolio actually starts calling Clara.

### Review checklist

When reviewing a PR that touches anything Clara-adjacent:

- [ ] No imports from `external/etracker/` in trefolio source.
- [ ] No build config newly globbing `external/`.
- [ ] If `external/etracker` pointer changed, the PR has an explicit "bump clara pin" reason.
- [ ] First time trefolio actually fetches Clara with user data: this triggers the `[legal-advisor](../../.cursor/skills/legal-advisor/SKILL.md)` skill (new third-party processor + data path).

## Open questions

- **MCP vs raw HTTP**: leaning HTTP for now because trefolio is a Next.js server, not an agent host. We can add MCP transport later without breaking callers.
- **Auth between trefolio and Clara**: TBD. Likely a shared service token in env, rotated like other internal secrets.
- **Multi-tenant data**: how Clara handles trefolio user IDs (and whether it stores anything about them) is the first decision to make before any production fetch.
