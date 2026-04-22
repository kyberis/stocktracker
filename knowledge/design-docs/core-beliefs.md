# core-beliefs

A handful of non-negotiable principles we stop at a red line to defend. Everything else is negotiable.

## 1. The repo is the memory

All durable knowledge lives in the repository. Agents should never need to read external context, notebooks, or ask for tribal knowledge.
- Adding a user-facing feature means updating `knowledge/product-specs/` AND `src/lib/release-notes.ts` AND (if landing-worthy) `src/app/landing/page.tsx`. Enforced by `.cursor/rules/*`.
- Generated docs (`knowledge/generated/`) must round-trip with code — CI fails on drift.

## 2. Correctness of money beats features

No feature ships that breaks currency, FX, or tax math. Our customers' trust is the product.
- EUR-base is the internal invariant; currency conversion at every display boundary.
- GBX to GBP conversion must be explicit; never pass GBX out of the parser.
- Historical FX must be stored per transaction date; never rebased at read time.
- See [`financial-calculations` skill](../../.cursor/skills/financial-calculations/SKILL.md).

## 3. Agent legibility over cleverness

We optimize the codebase to be read quickly by agents more than to minimize LoC.
- One feature ↔ one product spec ↔ one `src/lib/db/*` module ↔ one set of API routes.
- Cross-domain reads go through aggregators, never ad-hoc queries.
- Every skill points back to its product-spec(s); every product-spec points back to its owning skill.

## 4. Tier enforcement is server-side

Never rely on UI alone to gate Pro features. `requireSubscriptionFeature()` must be called server-side too.

## 5. AI outputs are untrusted input

Treat any AI output as untrusted: sanitize markdown, validate structured output, never execute model-proposed code. See [`automated-user-comms`](../../.cursor/skills/automated-user-comms/SKILL.md).

## 6. Localized + accessible by default

Every new user-facing string is keyed and translated; every new interactive element is keyboard-operable and reachable by a screen reader. See [`accessibility-reviewer`](../../.cursor/skills/accessibility-reviewer/SKILL.md).

## 7. Legal guardrails on every data path

New data fields, third-party integrations, AI prompts, or marketing copy trigger a [`legal-advisor`](../../.cursor/skills/legal-advisor/SKILL.md) review (see `.cursor/rules/legal-compliance.mdc`).

## 8. Token-efficient collaboration

Compress scaffolding, not requirements. Preserve explicit "must" / "do not" / numeric constraints; strip preamble. See `.cursor/rules/token-efficiency.mdc`.
