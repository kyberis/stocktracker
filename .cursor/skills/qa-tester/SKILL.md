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
- Add or update E2E tests for **every** user-visible workflow change — this is mandatory.
- Reuse helpers in `e2e/helpers.ts`:
  - `apiLogin`, `apiSignup`, `createTestUser`
  - `loginViaUI`, `loginAsAdmin`, `ensureLoggedOut`
  - `dismissOverlays`
- Keep test names behavior-focused and explicit.
- Avoid brittle selectors; prefer semantic/stable locators.

## E2E Quality Gates (Enforced by All Engineer Skills)

All engineer skills now require passing four quality gates. QA tester is responsible for verifying these are met:

### Gate 1: E2E Test Coverage

- Every user-visible change **must** have a corresponding E2E spec in `e2e/`.
- Happy path + at least one error/edge case.
- Tier-gated features must test both free and pro user paths.
- Run `npx playwright test <spec>` to validate before delivery.

### Gate 2: Theme Coverage

E2E tests for UI changes must verify rendering across **all four themes** (Default, Canvas, Terminal, Studio):

- Use `setThemeViaAPI()` helper pattern (see `e2e/dashboard-themes.spec.ts`) to switch themes in tests.
- Verify no missing elements, broken layouts, or unreadable text in any theme.
- Forced dark themes (Terminal, Studio) and forced light (Canvas) must both pass.

### Gate 3: Responsive Breakpoints

E2E tests for UI changes must test at multiple viewports:

- Use `page.setViewportSize({ width: 375, height: 812 })` for mobile.
- Use `page.setViewportSize({ width: 768, height: 1024 })` for tablet.
- Use `page.setViewportSize({ width: 1280, height: 800 })` for desktop.
- Verify: no horizontal scroll, touch targets ≥44px on mobile, correct layout mode (MobileTabBar on mobile, sidebar on desktop for Studio).

### Gate 4: Mobile Native (Capacitor)

For features touching layout, navigation, overlays, or input handling:

- Verify safe area insets (`env(safe-area-inset-*)`) in CSS.
- Verify keyboard handling — inputs scroll into view, keyboard doesn't obscure content.
- Verify Capacitor-specific code is gated with `isNativePlatform()`.
- Verify Android hardware back button behavior for modals/drawers.

### Gate 5: Code Coverage ≥ 80%

All engineer skills enforce a **minimum 80% line coverage** threshold on new and modified files:

- Run `npx vitest run --coverage` and inspect the report for all files touched by the change.
- If any modified file drops below 80% line coverage, add unit tests before approving.
- Pure UI components may combine E2E and unit coverage to meet the threshold; pure logic files must have Vitest unit tests.
- Coverage must never decrease on a file that was already above 80%.
- Security-critical (auth, payments) and financial-calculation files should aim higher than the floor.

## Manual QA Checklist Template

```md
Manual QA Checklist
- [ ] Happy path works end-to-end
- [ ] Empty, loading, and error states are correct
- [ ] All 4 themes verified (Default, Canvas, Terminal, Studio)
- [ ] Light mode (Default light, Canvas) and dark mode (Default dark, Terminal, Studio)
- [ ] Mobile (375px), tablet (768px), and desktop (1280px) layouts verified
- [ ] Capacitor native: safe areas, keyboard, back button
- [ ] Code coverage ≥ 80% on new/modified files (`npx vitest run --coverage`)
- [ ] English and Spanish content is correct
- [ ] No auth/permission regressions
- [ ] E2E spec passes locally (`npx playwright test`)
```

## Regression Expectations

- Touching auth/admin flows requires auth regression checks.
- Touching calculations requires numeric correctness checks.
- Touching imports/providers requires malformed-input checks.
- Touching analytics requires event emission verification.
- **Any UI change** requires theme, responsive, and native regression checks.
- **Any code change** must maintain ≥ 80% line coverage on touched files.

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
