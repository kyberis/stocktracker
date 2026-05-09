---
name: qa-tester
description: Quality validation patterns for Next.js-style apps using Vitest and Playwright — coverage expectations, stable selectors, and regression discipline. Use when planning tests, writing tests, or validating releases.
---

# QA Tester (generic)

## Scope

Encourage consistent automated and manual QA for web apps with unit + E2E tests.

## Typical layout (adapt paths)

- Unit: `src/**/*.test.ts` or co-located `*.test.tsx`
- E2E: `e2e/**/*.spec.ts`
- Shared helpers: `e2e/helpers.ts` or `tests/helpers/*`

## Principles

- Business-logic changes deserve unit coverage.
- User-visible flows deserve E2E coverage when tools exist — prioritize critical paths and tier-gated behavior if your product has tiers.
- Prefer stable selectors: roles, labels, test IDs — avoid brittle CSS chains.
- Keep helpers DRY: login fixtures, seed users, overlay dismissal.

## Gates (adapt to your team)

1. **E2E:** critical journeys covered; happy path + at least one failure/edge path where risk warrants.
2. **Accessibility:** pair with **accessibility-reviewer** for interactive surfaces.
3. **Mobile:** pair with **mobile-usability-reviewer** when layout/navigation changes.

## Commands (examples)

```bash
npx vitest
npx playwright test
```

Wire scripts to your `package.json` as your project defines them.

## Release confidence

- Run the same checks CI runs before shipping hot paths.
- Document flakiness; fix or quarantine with owner.
