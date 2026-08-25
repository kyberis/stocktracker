# Clara home CTA

> Mini-landing modal next to Warren that explains Clara and opens her chat via SSO.

## 1. Summary

Signed-in users see a **Clara** card beside **Warren** on Home (rail + mobile), Classic dashboard, and mobile dashboard. Clicking opens a modal that explains Clara (personal finance sister app). The CTA either opens Clara chat (`/app`) when the IdP identity is already linked, or starts Clara login (`/login`) so the shared IdP account lazy-creates the Clara local user — then the user lands in Clara chat in a **new tab**.

## 2. Status

- **Tier:** Free (all authenticated users)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-homepage/SKILL.md`](../../.cursor/skills/engineer-homepage/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Component | `src/components/clara/ClaraCta.tsx` | Trigger + modal wrapper |
| Component | `src/components/clara/ClaraTrigger.tsx` | Card CTA |
| Component | `src/components/clara/ClaraLandingModal.tsx` | Mini-landing dialog |
| API | `GET /api/clara/status` | `{ linked: boolean }` via savings-summary probe |
| Lib | `src/lib/clara-public-url.ts` | `NEXT_PUBLIC_CLARA_URL` + defaults |
| Surfaces | `HomeV2Dashboard`, `DashboardPortfolioV2`, `MobileDashboard` | Next to Warren |

## 4. Data model

No new tables. Link status inferred from Clara `GET /api/internal/office/savings-summary` (404 → unlinked).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/clara/status` | session | Free | `{ linked: boolean }` |

## 6. UI surface

- Sky-accent card matching Warren layout (avatar, name, subtitle, chevron).
- Modal via `AidModalShell` (focus trap, Escape, backdrop).
- Demo mode: trigger links to `/signup` (same as Warren).

## 7. Business logic

- Account “creation” = Clara OIDC first sign-in with the same IdP `sub` (lazy upsert). No new credentials in the modal.
- Chat opens with `window.open(..., "_blank", "noopener,noreferrer")` — not embedded (Clara is a separate deploy).

## 8. External dependencies

- `NEXT_PUBLIC_CLARA_URL` (optional client override).
- Server probe uses `CLARA_BASE_URL` + `IDP_SERVICE_TOKEN` via existing `fetchClaraSavingsSummary`.

## 9. Currency / FX / tax implications

None.

## 10. i18n

Keys `claraName`, `claraTriggerSub`, `claraModal*` in `en.ts` / `es.ts` (other locales fall back to EN).

## 11. Permissions / tier gating / rate limits

Authenticated only (dashboard). No Pro gate for the CTA itself; Clara message limits apply on Clara.

## 12. Telemetry

| Event | Purpose |
|-------|---------|
| `clara_cta_opened` | Modal opened |
| `clara_modal_cta_clicked` | Primary CTA (`kind`: `linked` \| `create`) |

## 13. Testing

- Unit: `src/lib/clara-public-url.test.ts`
- Manual: open modal on Home; linked vs unlinked CTA labels; new tab to Clara.

## 14. Related

- [etracker-clara-integration](../design-docs/etracker-clara-integration.md)
- [clara-idp-integration](../design-docs/clara-idp-integration.md)
- [unified-homepage](unified-homepage.md)
- [agent-office](agent-office.md)
