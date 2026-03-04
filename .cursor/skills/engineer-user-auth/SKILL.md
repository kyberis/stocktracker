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

## Delivery Checklist

```md
Auth/Admin Change Checklist
- [ ] Route guard is correct (`requireSession` or `requireAdmin`)
- [ ] Session cookie and auth flow are unchanged or intentionally updated
- [ ] Input validation and error handling are explicit
- [ ] Role constraints are enforced server-side
- [ ] User-facing text supports EN/ES
```

## Coordination

- If work includes admin analytics surfaces, involve `analytics-instrumentation`.
- If work changes onboarding/signup behavior, involve `product-manager`.
- Add/adjust tests with `qa-tester` for auth-critical changes.
