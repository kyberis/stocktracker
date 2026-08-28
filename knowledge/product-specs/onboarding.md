# onboarding

> Multi-step onboarding wizard after signup, including an optional Clara activation step.

## 1. Summary

Collects name, preferred currency, experience level, tax residency, use case, and referral source. Optionally offers a 7-day Pro trial, then an optional Clara SSO activation (same IdP account). Completing the wizard marks onboarding done and shows the import chooser.

## 2. Status

- **Tier:** all users
- **Feature flag:** trial step gated by `pro_trial_enabled` + `commerce_enabled`; Clara step has no flag
- **Health:** B
- **Owning skill:** [`ux-writer`](../../.cursor/skills/ux-writer/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/onboarding/page.tsx`](../../src/app/onboarding/page.tsx) | Wizard + import chooser. |
| API | [`POST /api/auth/onboarding`](../../src/app/api/auth/onboarding/route.ts) | Persist profile, optional trial, Clara outcome. |
| API | [`POST /api/auth/onboarding/trial-shown`](../../src/app/api/auth/onboarding/trial-shown/route.ts) | Trial offer impression. |
| API | [`GET /api/clara/status`](../../src/app/api/clara/status/route.ts) | Poll Clara link while the Clara step is visible. |
| Lib | [`src/lib/onboarding-clara-step.ts`](../../src/lib/onboarding-clara-step.ts) | Step indices + poll helpers. |
| DB | [`src/lib/db/users.ts`](../../src/lib/db/users.ts) | `completeOnboarding`. |

## 4. Data model

- `users.onboarding_completed` plus profile fields (display name, tax residency, experience).
- `user_settings.defaultCurrency`.
- No new table for Clara. Link is inferred from Clara `GET /api/internal/office/savings-summary` (404 → unlinked), same as [clara-home-cta](clara-home-cta.md).
- Analytics events in `analytics_events` (see Telemetry).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/auth/onboarding` | session | Free | Completes wizard. Optional `activateTrial`, `claraActivation` (`linked` \| `skipped`). |
| POST | `/api/auth/onboarding/trial-shown` | session | Free | Marks trial offer shown. |
| GET | `/api/clara/status` | session | Free | `{ linked }` used for Clara-step polling. |
| POST | `/api/analytics/track` | session | Free | `onboarding_clara_step_viewed`, `onboarding_clara_activate_clicked`. |

Input: [`onboardingSchema`](../../src/lib/schemas.ts).

## 6. UI surface

- Page: `/onboarding` (5 wizard steps + import phase).
- Steps: profile → use case → referral → Pro trial (if flags) → **Clara activate (optional)**.
- Clara step: avatar, value bullets, Activate (opens `getClaraLoginUrl()` in a new tab), Not now. Polls `/api/clara/status` every 2s; on `linked` shows success and auto-advances.
- Import chooser after POST succeeds (unchanged).

## 7. Business logic

- Clara account creation remains **lazy SSO** (Clara upserts local `User` on first OIDC sign-in). Trefolio does **not** provision Clara at IdP signup or in the OIDC callback.
- Skip Clara still completes onboarding. Home money desk keeps the create-account CTA.
- Hidden trial (flags off or already activated) auto-advances from step 3 to the Clara step.
- Trial choice is remembered until the Clara step POSTs `/api/auth/onboarding`.
- Demo (`/demo`) never mounts this wizard; demo users are pre-completed.

Pure helpers: [`src/lib/onboarding-clara-step.ts`](../../src/lib/onboarding-clara-step.ts), [`src/lib/onboarding-import-phase.ts`](../../src/lib/onboarding-import-phase.ts).

## 8. External dependencies

- Clara public origin: `NEXT_PUBLIC_CLARA_URL` (browser) / `CLARA_BASE_URL` (server status probe).
- IdP SSO on clara.trefolio.com — same `sub` as trefolio.

## 9. Currency / FX / tax implications

- Preferred display currency set here. No FX. Tax residency stored for later tax reports.

## 10. i18n

- Keys `onboardingClara*` and `onboardingStepClaraTitle` in [`src/locales/en.ts`](../../src/locales/en.ts) / [`es.ts`](../../src/locales/es.ts). Other locales fall back to English.

## 11. Permissions / tier gating / rate limits

- Authenticated users with `onboarding_completed = 0`. Middleware redirects them to `/onboarding`.
- Clara step is Free (same as [clara-home-cta](clara-home-cta.md)). Clara message quotas apply on Clara after SSO.

## 12. Telemetry

| Event | Source | When |
|-------|--------|------|
| `onboarding_clara_step_viewed` | client allow-list | Clara step mounts |
| `onboarding_clara_activate_clicked` | client allow-list | Activate Clara |
| `onboarding_clara_linked` | server | POST complete with `claraActivation: "linked"` |
| `onboarding_clara_skipped` | server | POST complete with `claraActivation: "skipped"` |
| `onboarding_trial_*` | server | Unchanged |
| `onboarding_import_method` | client | Import chooser |

Admin funnel stages include the four Clara events.

## 13. Edge cases & gotchas

- Popup blockers: skip remains available; polling continues if the tab did open.
- Already-linked users auto-advance without clicking Activate.
- Closing the tab on the Clara step does not persist trial/onboarding (same as abandoning any wizard step).
- Demo mode: wizard not shown.
- Mobile: Activate uses `window.open` + `noopener,noreferrer` (new tab, not in-app WebView embed).

## 14. Tests

- Unit: [`src/lib/onboarding-clara-step.test.ts`](../../src/lib/onboarding-clara-step.test.ts), [`src/lib/onboarding-import-phase.test.ts`](../../src/lib/onboarding-import-phase.test.ts).
- E2E: existing signup flows complete onboarding via `POST /api/auth/onboarding` (Clara field optional).
- Manual: activate + linked → money desk linked; skip → Home create-account CTA; demo `/demo` unchanged.

## 15. Related skills and rules

- [`ux-writer`](../../.cursor/skills/ux-writer/SKILL.md)
- [`analytics-instrumentation`](../../.cursor/skills/analytics-instrumentation/SKILL.md)
- [`legal-advisor`](../../.cursor/skills/legal-advisor/SKILL.md) (onboarding copy + sister-app disclaimer)
- [`accessibility-reviewer`](../../.cursor/skills/accessibility-reviewer/SKILL.md)
- Related specs: [import-hub](import-hub.md), [accounts-profile](accounts-profile.md), [clara-home-cta](clara-home-cta.md), [trial-system](trial-system.md).

## 16. Open questions / planned work

- Reduce overall step count if Clara + trial stacking hurts completion.
- Reconsider auto-provision at signup only if skip rate is high **and** money desk becomes a day-1 requirement.
