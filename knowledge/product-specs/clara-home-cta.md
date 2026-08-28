# Clara home CTA

> Mini-landing modal that explains Clara and opens her chat via SSO. On Home v2, Clara lives inside the Warren × Clara money desk.

## 1. Summary

**Home v2 (`/`):** signed-in users see a **money desk** (`HomeMoneyDesk`) that pairs Warren (markets / portfolio) with Clara (everyday spending). Dual pulse (day P&L × month surplus), agent tiles, Clara onboarding, and a deterministic handoff when both sides have data. On **mobile and empty portfolio**, the desk is the first block after the Home title.

**Classic dashboard and `MobileDashboard`:** still show a **Clara** card beside **Warren**. Clicking opens a modal that explains Clara (personal finance sister app). The CTA either opens Clara chat (`/app`) when the IdP identity is already linked, or starts Clara login (`/login`) so the shared IdP account lazy-creates the Clara local user — then the user lands in Clara chat in a **new tab**.

## 2. Status

- **Tier:** Free (all authenticated users)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-homepage/SKILL.md`](../../.cursor/skills/engineer-homepage/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Component | `src/components/homepage/HomeMoneyDesk.tsx` | Home v2 Warren × Clara desk |
| Hook | `src/hooks/useClaraDeskStatus.ts` | Client fetch of `/api/clara/status` |
| Lib | `src/lib/clara-desk-status.ts` | Status mapping + handoff rules |
| Component | `src/components/clara/ClaraCta.tsx` | Trigger + modal wrapper (Classic / mobile dashboard) |
| Component | `src/components/clara/ClaraTrigger.tsx` | Card CTA |
| Component | `src/components/clara/ClaraLandingModal.tsx` | Mini-landing dialog (desk + card) |
| API | `GET /api/clara/status` | Link probe + aggregated savings fields |
| Lib | `src/lib/clara-public-url.ts` | `NEXT_PUBLIC_CLARA_URL` + defaults |
| Surfaces | `HomeV2Dashboard` (desk), `DashboardPortfolioV2`, `MobileDashboard` | Classic/mobile still next to Warren |

## 4. Data model

No new tables. Link status inferred from Clara `GET /api/internal/office/savings-summary` (404 → unlinked). Desk shows only aggregated fields already on `ClaraSavingsSummary` (`surplusEur`, `currency`, `dayOfMonth`, `daysInMonth`, `monthBalance`). No line items.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/clara/status` | session | Free | `{ linked, surplusEur?, currency?, dayOfMonth?, daysInMonth?, monthBalance? }` |

`linked` remains the contract for the modal. Extra fields are omitted when unlinked.

## 6. UI surface

**Money desk (Home v2):**

- Header “Your money desk” + dual pulse + Warren / Clara tiles + optional handoff + “Not financial advice”.
- **Mobile / empty:** first in the main column (above `EmptyPortfolio` / brief). `EmptyPortfolio` stays below for import/add.
- **Desktop with holdings:** rail, replacing the separate Warren + Clara cards. `AidWarrenNudge` stays under the desk.
- Matrix: holdings × Clara linked — pulse, tile CTAs, and handoff (surplus handoff only when `surplusEur > 0`; empty + linked shows a soft “add first stock” line).
- Unlinked Clara tile: **Create Clara account** → same landing modal (SSO `/login`).
- Linked Clara tile: modal → open chat.
- Demo: both tiles → `/signup`.
- Touch targets ≥44px. Day P&L uses +/− not color alone.

**Classic / mobile dashboard card:**

- Sky-accent card matching Warren layout (avatar, name, subtitle, chevron).
- Modal via `AidModalShell` (focus trap, Escape, backdrop).
- Demo mode: trigger links to `/signup` (same as Warren).
- Global [agent-dock](agent-dock.md) chip also opens this modal.

## 7. Business logic

- Account “creation” = Clara OIDC first sign-in with the same IdP `sub` (lazy upsert). No new credentials in the modal.
- Chat opens with `window.open(..., "_blank", "noopener,noreferrer")` — not embedded (Clara is a separate deploy).
- Handoff v1 is deterministic i18n copy (no LLM). Generic surplus wording — not a ticker-specific recommendation.

## 8. External dependencies

- `NEXT_PUBLIC_CLARA_URL` (optional client override).
- Server probe uses `CLARA_BASE_URL` + `IDP_SERVICE_TOKEN` via existing `fetchClaraSavingsSummary`.

## 9. Currency / FX / tax implications

- Day P&L formatted in the active portfolio display currency (same as Home hero).
- Clara surplus formatted in Clara’s `currency` (fallback EUR). No mid-calc FX conversion in v1.

## 10. i18n

Keys `claraName`, `claraTriggerSub`, `claraModal*`, `homeMoneyDesk*` in `en.ts` / `es.ts` (other locales fall back to EN).

## 11. Permissions / tier gating / rate limits

Authenticated only (dashboard). No Pro gate for the CTA itself; Clara message limits apply on Clara.

## 12. Telemetry

| Event | Purpose |
|-------|---------|
| `home_money_desk_viewed` | Desk shown (`holdings`, `linked`: yes \| no) |
| `home_money_desk_warren_clicked` | Warren tile (`empty`: yes \| no) |
| `home_money_desk_clara_clicked` | Clara tile (`kind`: `linked` \| `create`) |
| `clara_cta_opened` | Modal opened |
| `clara_modal_cta_clicked` | Primary CTA (`kind`: `linked` \| `create`) |

## 13. Testing

- Unit: `src/lib/clara-public-url.test.ts`, `src/lib/clara-desk-status.test.ts`, `src/app/api/clara/status/route.test.ts`
- Manual: Home empty vs holdings; Clara linked vs unlinked; mobile desk first; modal create-account vs open-chat.

## 14. Related

- [etracker-clara-integration](../design-docs/etracker-clara-integration.md)
- [clara-idp-integration](../design-docs/clara-idp-integration.md)
- [unified-homepage](unified-homepage.md)
- [agent-office](agent-office.md)
- [agent-dock](agent-dock.md)

## 15. Open questions

- Whether surplus should convert from EUR into the user's display currency in v2.
- Classic / `MobileDashboard` parity with the money desk (follow-up).
