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
