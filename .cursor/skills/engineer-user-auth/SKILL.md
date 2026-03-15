---
name: engineer-user-auth
description: Implements user, authentication, profile, and admin capabilities with existing session, guard, and role patterns. Use when working on login/signup, account security, profile management, or admin APIs/UI.
---

# User, Auth, and Admin Engineer

## Scope

Own authentication, session security, user profile, and admin access patterns.

## Primary Files

- `src/lib/auth/session.ts`
- `src/lib/auth/guards.ts`
- `src/lib/auth/password.ts`
- `src/lib/auth/session-secret.ts`
- `src/lib/auth-context.tsx`
- `src/middleware.ts`
- `src/app/api/auth/**`
- `src/app/api/admin/**`
- `src/app/admin/page.tsx`
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/change-password/page.tsx`
- `src/components/ProfilePage.tsx`
- `src/components/SettingsModal.tsx`

## Core Rules

- Keep JWT session handling in `src/lib/auth/session.ts`; do not fork auth logic.
- Use `requireSession()` for authenticated API routes.
- Use `requireAdmin()` for admin-only API routes.
- Keep passwords hashed with `bcryptjs` using project defaults.
- Store sessions in secure httpOnly cookie patterns already established.
- Maintain role model as `admin | user`.

## Security Expectations

- Reject invalid credentials with safe, non-leaking error messages.
- Validate request bodies before processing.
- Protect sensitive endpoints from unauthenticated access.
- Use existing encryption utilities for API keys and secrets.
- Preserve forced password change flow for default admin credentials.

## UI/UX Expectations

- Auth pages should preserve current routing and redirect behavior.
- Keep auth-related forms clear and minimal.
- Ensure user-facing auth text supports English and Spanish.
- Respect theme requirements for auth pages and shared components.

## Quality Gates (Mandatory)

Every auth/admin change MUST pass all gates below before delivery.

### Gate 1: E2E Tests (Playwright)

- **Add or update** an E2E spec in `e2e/` for any auth flow change (login, signup, password, admin).
- Existing E2E specs: `e2e/auth.spec.ts`, `e2e/admin.spec.ts` — extend or add to these.
- Reuse helpers from `e2e/helpers.ts` (`createTestUser`, `loginViaUI`, `loginAsAdmin`, `ensureLoggedOut`).
- Cover happy path, invalid credentials, session expiry, and role-gated access.
- Run `npx playwright test <spec>` locally before marking done.

### Gate 2: All Themes

Auth pages (login, signup, profile, change-password, admin) must render correctly in **all four themes**:

- Verify forced dark (Terminal, Studio) and forced light (Canvas) modes.
- Use CSS custom properties — never hard-code colors on auth forms or admin panels.
- Verify text contrast meets WCAG AA in all theme modes.

### Gate 3: Responsive Design

Test auth and admin pages at **three breakpoints**:

| Breakpoint | Width | What to verify |
|---|---|---|
| Mobile | 375px | Forms fill screen width, buttons are tap-friendly (≥44px), no horizontal scroll |
| Tablet | 768px | Forms centered, modals fit, admin tables scrollable |
| Desktop | 1280px | Full layout, admin panels use available space |

- Use Playwright `page.setViewportSize()` in E2E specs for mobile and desktop.
- Verify keyboard/input behavior on small viewports.

### Gate 4: Mobile Native (Capacitor)

For auth changes that affect login, signup, OAuth, or session handling:

- Verify cookie persistence survives app backgrounding and relaunch in WebView.
- OAuth redirect flows must work inside Capacitor WebView (no external browser required).
- Keyboard must not obscure input fields on login/signup forms.
- Safe area insets must be respected on auth pages.
- Gate native-specific behavior with `isNativePlatform()` from `src/lib/capacitor.ts`.

### Gate 5: Code Coverage ≥ 80%

- New and modified files must maintain **≥ 80% line coverage**.
- Run `npx vitest run --coverage` and check the report for touched files.
- Auth logic files (`src/lib/auth/*`) are security-critical — cover all branches including error paths, session expiry, and role checks.
- Never reduce existing coverage on a file.

## Delivery Checklist

```md
Auth/Admin Change Checklist
- [ ] Route guard is correct (`requireSession` or `requireAdmin`)
- [ ] Session cookie and auth flow are unchanged or intentionally updated
- [ ] Input validation and error handling are explicit
- [ ] Role constraints are enforced server-side
- [ ] User-facing text supports EN/ES
- [ ] Code coverage ≥ 80% on new/modified files (`npx vitest run --coverage`)
- [ ] E2E spec added/updated (auth flows, admin flows)
- [ ] Works in all 4 themes (Default, Canvas, Terminal, Studio)
- [ ] Works at mobile (375px), tablet (768px), and desktop (1280px)
- [ ] Capacitor/native: cookies, OAuth, keyboard, safe areas verified
```

## Coordination

- If work includes admin analytics surfaces, involve `analytics-instrumentation`.
- If work changes onboarding/signup behavior, involve `product-manager`.
- Add/adjust tests with `qa-tester` for auth-critical changes.
- If change affects theme rendering, invoke `theme-parity` skill.
- If change affects native mobile behavior, involve `engineer-mobile`.
