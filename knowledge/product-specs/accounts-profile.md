# accounts-profile

> Profile settings: display name, locale, preferred currency, theme, avatar.

## 1. Summary

User-editable profile settings used across the product. Locale and preferred currency propagate to UI copy, email templates, and display conversion. Theme choice drives the dashboard's visual.

## 2. Status

- **Tier:** Free. Extra themes (Canvas, Terminal, Studio) are Bifolio/Trefolio.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-user-auth`](../../.cursor/skills/engineer-user-auth/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/profile/`](../../src/app/(app)/profile) | Settings page. |
| API | [`src/app/api/auth/profile/`](../../src/app/api/auth/profile) | GET/PATCH profile. |
| API | [`src/app/api/user-settings/`](../../src/app/api/user-settings) | Granular settings. |

## 4. Data model

- `users` (display name, locale, preferred_currency, theme, avatar_url).
- `user_settings` ([`src/lib/db/settings.ts`](../../src/lib/db/settings.ts)) for free-form preferences (`dashboard_tab`, `notifications_*`, `benchmarks`, etc.).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/auth/profile` | user | Free | Returns current profile. |
| PATCH | `/api/auth/profile` | user | Free | Update fields. |
| GET/PATCH | `/api/user-settings` | user | Free | Granular settings. |

## 6. UI surface

- Profile page with avatar upload, locale selector, currency selector, theme selector.
- `LanguageSwitcher` surfaced in nav for quick locale swap.

## 7. Business logic

- Currency change triggers display recompute (no DB writes for amounts).
- Locale change switches UI + default email locale.
- Avatar upload via Vercel Blob.

## 8. External dependencies

- Vercel Blob for avatars (`BLOB_READ_WRITE_TOKEN`).

## 9. Currency / FX / tax implications

- Preferred currency is a display concern only. Storage stays in EUR. See [`design-docs/eur-base-fx.md`](../design-docs/eur-base-fx.md).

## 10. i18n

All locales.

## 11. Permissions / tier gating / rate limits

- Auth required. Avatar size capped (2MB). Updates: 60/hour/user.

## 12. Telemetry

- `analytics_events`: `profile.locale.changed`, `profile.currency.changed`, `profile.theme.changed`.

## 13. Edge cases & gotchas

- Uploading a new avatar doesn't delete the old blob (blob GC via cron TODO).
- Changing preferred currency does not re-fetch historical snapshots — display math is EUR → target.

## 14. Tests

- [`src/lib/db/settings.test.ts`](../../src/lib/db/settings.test.ts)

## 15. Related skills and rules

- [`engineer-user-auth`](../../.cursor/skills/engineer-user-auth/SKILL.md)
- [`ux-writer`](../../.cursor/skills/ux-writer/SKILL.md) (locale-aware copy)

## 16. Open questions / planned work

- Blob GC cron for stale avatars.
- Bulk locale detection from browser Accept-Language.
