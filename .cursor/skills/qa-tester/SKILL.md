---
name: qa-tester
description: Defines manual and automated quality validation for StockTracker features using Vitest and Playwright. Use when planning tests, writing tests, validating regressions, or preparing release confidence checks.
---

# QA Tester

## Scope

Own test strategy for both manual QA and automation coverage.

## Test Stack

- Unit tests: Vitest (`src/**/*.test.ts`)
- E2E tests: Playwright (`e2e/*.spec.ts`)
- Key helpers: `e2e/helpers.ts`
- CI/pre-release script: `scripts/pre-deploy.sh`

## Automation Rules

- Add or update unit tests for business-logic changes.
- Add or update E2E tests for user-visible workflow changes.
- Reuse helpers in `e2e/helpers.ts`:
  - `apiLogin`, `apiSignup`, `createTestUser`
  - `loginViaUI`, `loginAsAdmin`, `ensureLoggedOut`
- Keep test names behavior-focused and explicit.
- Avoid brittle selectors; prefer semantic/stable locators.

## Manual QA Checklist Template

```md
Manual QA Checklist
- [ ] Happy path works end-to-end
- [ ] Empty, loading, and error states are correct
- [ ] Light and dark themes are correct
- [ ] Mobile and desktop layouts are usable
- [ ] English and Spanish content is correct
- [ ] No auth/permission regressions
```

## Regression Expectations

- Touching auth/admin flows requires auth regression checks.
- Touching calculations requires numeric correctness checks.
- Touching imports/providers requires malformed-input checks.
- Touching analytics requires event emission verification.

## Output Format

When reporting results, use:

```md
## QA Report
- Scope: [...]
- Automated tests added/updated: [...]
- Manual checks run: [...]
- Findings: [...]
- Risk level: [Low/Medium/High]
```

## Coordination

- Pair with domain engineer owning the feature area.
- Confirm instrumentation with `analytics-instrumentation`.
- Escalate unclear acceptance criteria to `product-manager`.
