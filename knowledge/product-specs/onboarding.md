# onboarding

> Multi-step onboarding wizard after signup, including an optional Clara activation step.

## 1. Summary

Collects name, preferred currency, experience level, tax residency, use case, and referral source. Optionally offers a 7-day Pro trial, then an optional Clara activation (same IdP account, provisioned in-place). Completing the wizard marks onboarding done and shows the import chooser.

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
| API | [`GET /api/clara/status`](../../src/app/api/clara/status/route.ts) | One-shot link check when the Clara step mounts. |
| API | [`POST /api/clara/activate`](../../src/app/api/clara/activate/route.ts) | In-place Clara provision via Clara `ensure-user`. |
| Lib | [`src/lib/onboarding-clara-step.ts`](../../src/lib/onboarding-clara-step.ts) | Step indices + activate helpers. |
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
| GET | `/api/clara/status` | session | Free | `{ linked }` — one-shot check if already linked. |
| POST | `/api/clara/activate` | session | Free | Provisions Clara via S2S `ensure-user`; `{ linked, created? }`. |
| POST | `/api/analytics/track` | session | Free | `onboarding_clara_step_viewed`, `onboarding_clara_activate_clicked`. |

Input: [`onboardingSchema`](../../src/lib/schemas.ts).

## 6. UI surface

- Page: `/onboarding` (5 wizard steps + import phase).
- Steps: profile → use case → referral → Pro trial (if flags) → **Clara activate (optional)**.
- Clara step: avatar, value bullets, Activate (`POST /api/clara/activate` in-place — no new tab), Not now. One-shot `/api/clara/status` on mount if already linked; on success shows linked and auto-advances.
- Import chooser after POST succeeds (unchanged).

## 7. Business logic

- Clara account creation is **S2S ensure-user** on Activate (same IdP `sub` / email). Trefolio does **not** auto-provision Clara at IdP signup. Clara terms and Clara’s own onboarding still gate the first visit to Clara `/app`.
- Skip Clara still completes onboarding. Home money desk keeps the create-account CTA.
- Hidden trial (flags off or already activated) auto-advances from step 3 to the Clara step.
- Trial choice is remembered until the Clara step POSTs `/api/auth/onboarding`.
- Demo (`/demo`) never mounts this wizard; demo users are pre-completed.

Pure helpers: [`src/lib/onboarding-clara-step.ts`](../../src/lib/onboarding-clara-step.ts), [`src/lib/onboarding-import-phase.ts`](../../src/lib/onboarding-import-phase.ts).

## 8. External dependencies

- Clara public origin: `NEXT_PUBLIC_CLARA_URL` (browser chat later) / `CLARA_BASE_URL` (server ensure-user + status).
- Shared IdP `sub` with Clara.

## 9. Currency / FX / tax implications

- Preferred display currency set here. No FX. Tax residency stored for later tax reports.

## 10. i18n

- Keys `onboardingClara*` and `onboardingStepClaraTitle` in [`src/locales/en.ts`](../../src/locales/en.ts) / [`es.ts`](../../src/locales/es.ts). Other locales fall back to English.

## 11. Permissions / tier gating / rate limits

- Authenticated users with `onboarding_completed = 0`. Middleware redirects them to `/onboarding`.
- Clara step is Free (same as [clara-home-cta](clara-home-cta.md)). Clara message quotas apply on Clara after the account exists.

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

- Unit: [`src/lib/onboarding-clara-step.test.ts`](../../src/lib/onboarding-clara-step.test.ts), [`src/lib/onboarding-import-phase.test.ts`](../../src/lib/onboarding-import-phase.test.ts), [`src/app/api/clara/activate/route.test.ts`](../../src/app/api/clara/activate/route.test.ts).
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
