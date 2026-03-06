---
name: regression-tester
description: Runs a comprehensive on-demand regression test across all StockTracker features using browser automation, E2E tests, and unit tests. Use when the user asks to run regression tests, validate all features, do a full QA pass, smoke test the app, or check for regressions before a release.
---

# Regression Tester

## Mission

Systematically verify every major feature area of the app works correctly. Run on demand to catch regressions before releases or after large changes.

## Prerequisites

Before starting, verify the app is running:

1. Check if dev server is already running by navigating to `http://localhost:3000` with `browser_navigate`.
2. If not running, start it: `npm run dev` (background).
3. Confirm the landing page loads before proceeding.

## Execution Strategy

Run the regression in three phases. Report results after each phase so the user can see progress.

### Phase 1 — Automated Tests

Run existing automated test suites first (fastest feedback):

```bash
# Unit tests
npx vitest run

# E2E tests (against running dev server)
E2E_BASE_URL=http://localhost:3000 npx playwright test
```

If any automated test fails, report immediately and flag the affected feature area. Continue with Phase 2 regardless.

### Phase 2 — Browser Smoke Tests

Use the browser MCP tools to visually verify each feature area. For each area:

1. `browser_navigate` to the page.
2. `browser_take_screenshot` to capture the state.
3. `browser_snapshot` to inspect the DOM structure.
4. Verify key elements are present and functional.
5. Log PASS or FAIL with details.

Follow the checklist in [regression-checklist.md](regression-checklist.md) for the full test matrix.

### Phase 3 — Cross-Cutting Concerns

After feature-area checks, verify:

- **Theme**: toggle dark/light and confirm no broken styles.
- **Language**: switch to Spanish and confirm translated content appears.
- **Mobile**: resize browser to 375x812 and verify mobile layout + bottom tabs.
- **Auth boundary**: verify unauthenticated access redirects to landing.
- **Paywall**: verify Free user cannot access Pro features (fundamentals, intelligence, economic indicators).

## Test Accounts

Use the E2E helper patterns for test accounts:

- **Fresh user**: create via `POST /api/auth/signup` with `{ email: "regression_<timestamp>@test.example.com", password: "TestPass123!" }`.
- **Admin**: login via `POST /api/auth/login` with env `ADMIN_USERNAME` / `ADMIN_PASSWORD` (default `admin`/`admin`), handle `mustChangePassword` flow.
- **Pro user**: admin can upgrade a test user via the admin panel.

## Output Format

Report results using this structure:

```md
## Regression Test Report

**Date**: [date]
**Environment**: [localhost:3000 / staging URL]
**Duration**: [total time]

### Phase 1 — Automated Tests
- Unit tests: [X passed, Y failed]
- E2E tests: [X passed, Y failed]

### Phase 2 — Browser Smoke Tests

| # | Area | Test | Result | Notes |
|---|------|------|--------|-------|
| 1 | Landing | Page loads, features visible | PASS/FAIL | |
| 2 | Auth | Login flow | PASS/FAIL | |
| ... | ... | ... | ... | |

### Phase 3 — Cross-Cutting
| Check | Result | Notes |
|-------|--------|-------|
| Dark/Light theme | PASS/FAIL | |
| Spanish translation | PASS/FAIL | |
| Mobile layout | PASS/FAIL | |
| Auth boundary | PASS/FAIL | |
| Paywall enforcement | PASS/FAIL | |

### Summary
- **Total checks**: [N]
- **Passed**: [N]
- **Failed**: [N]
- **Risk level**: [Low / Medium / High]
- **Blocking issues**: [list or "None"]

### Failed Tests Detail
[For each failure: steps to reproduce, expected vs actual, screenshot path]
```

## Coordination

- If failures are found, reference the relevant domain engineer skill for the fix.
- For flaky tests, re-run once before marking as failed.
- Save all screenshots to a temporary folder and reference them in the report.

## Additional Resources

- Full test matrix: [regression-checklist.md](regression-checklist.md)
- QA strategy: `qa-tester` skill
- E2E helpers: `e2e/helpers.ts`
- Pre-deploy script: `scripts/pre-deploy.sh`
