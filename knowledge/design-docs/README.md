# Design Docs

Cross-cutting patterns, principles, and non-obvious contracts that apply across many product specs. Promote here when a pattern repeats in ≥3 specs.

## Index

- [core-beliefs.md](core-beliefs.md) — The handful of non-negotiables that govern our engineering.
- [eur-base-fx.md](eur-base-fx.md) — Why and how the entire app uses EUR as the internal base for FX math.
- [tier-gating-pattern.md](tier-gating-pattern.md) — The paywall/feature-flag/tier resolution pattern.
- [streaming-ai-pattern.md](streaming-ai-pattern.md) — The shape of a streaming AI route on Vercel.
- [idempotent-crons.md](idempotent-crons.md) — How we make cron jobs safely retryable.
- [demo-mode-contract.md](demo-mode-contract.md) — Contract for `demoMode` in `PortfolioProvider`.
- [snapshots-materialization.md](snapshots-materialization.md) — How portfolio snapshots and materialization interact.
- [unified-accounts-and-billing.md](unified-accounts-and-billing.md) — One identity and one Pro subscription across trefolio, Clara, and Will via an OIDC IdP at `user.trefolio.com`.
- [etracker-clara-integration.md](etracker-clara-integration.md) — How trefolio links to Clara (the financial-agents sister codebase).
- [clara-idp-integration.md](clara-idp-integration.md) — Clara-side change list to become an OIDC client of `user.trefolio.com`.
- [notetaker-will-integration.md](notetaker-will-integration.md) — How trefolio links to Will (the note-taking sister codebase).
- [will-idp-integration.md](will-idp-integration.md) — Will-side change list to become an OIDC client of `user.trefolio.com`.

## Cursor skills

Each codebase that participates in unified login also carries **`.cursor/skills/integration-trefolio-accounts/SKILL.md`** (trefolio monorepo root, `external/accounts`, `external/etracker`, `external/notetaker`) so agents open the right repo with a short integration map and pointers back to this folder.

**Standalone submodule clones** (only accounts / Clara / Will opened in Cursor): install the personal hub once — `~/.cursor/skills/integration-trefolio-accounts/SKILL.md` — so the same skill name resolves without the monorepo tree. It defers to repo-local skills when you later open stocktracker.
