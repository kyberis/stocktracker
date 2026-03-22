---
name: UX Review Fixes
overview: "Fix all issues found during the simulated first-time investor experience: copyright consistency, purchase date timezone bug, display name duplication, tools error boundary, email verification banner clarity, and guided tour for new users."
todos:
  - id: fix-copyright
    content: "Unify copyright year: replace hardcoded 2026 in email templates with dynamic getFullYear()"
    status: completed
  - id: fix-purchase-date
    content: "Fix purchase date default: use local date instead of UTC to avoid showing 'tomorrow' in Americas timezones"
    status: completed
  - id: fix-display-name-dup
    content: Skip display name in onboarding step 0 when already set from signup
    status: completed
  - id: fix-tools-error-boundary
    content: Add error boundary to Tools page and all dynamic tab panels to prevent full-page crashes
    status: completed
  - id: fix-email-banner
    content: "Improve email verification banner: clarify what works without verifying, fix 'data export' claim"
    status: completed
  - id: add-dashboard-tour
    content: "Add lightweight first-visit tooltip tour on the dashboard (3 steps: portfolio, tools, import)"
    status: completed
isProject: false
---

# UX Review Fixes

Fixes for all issues found during the simulated first-time investor experience, ordered by severity and effort.

---

## 1. Unify Copyright Year

**Problem**: Email template seeds (`src/lib/db/email-template-seeds.ts` line 55) and template HTML generator (`src/lib/email-i18n/template-html.ts` line 57) hardcode `© 2026 trefolio`, while all UI footers use `new Date().getFullYear()`. After 2026 the email footers will be stale.

**Fix**:

- `src/lib/email-i18n/template-html.ts` — replace `2026` with `${new Date().getFullYear()}`
- `src/lib/db/email-template-seeds.ts` — replace `2026` with `${new Date().getFullYear()}` in the footer string builder
- No changes needed in UI footers (already dynamic)

**Files**: `src/lib/email-i18n/template-html.ts`, `src/lib/db/email-template-seeds.ts`  
**Effort**: 5 minutes  
**Risk**: None

---

## 2. Fix Purchase Date Default (Timezone Bug)

**Problem**: `AddStockModal.tsx` uses `new Date().toISOString().slice(0, 10)` which returns the UTC date. For users in Americas timezones (UTC-5 to UTC-8), this can show "tomorrow" as the default purchase date in the evening, which is confusing.

**Fix**: Replace UTC-based date with local date:

```typescript
// Before (UTC):
new Date().toISOString().slice(0, 10)

// After (local):
const now = new Date();
const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
```

Extract as a shared helper `toLocalDateString()` in `src/lib/utils.ts` since the same pattern appears in multiple files.

**Files to update**:

- `src/lib/utils.ts` — add `toLocalDateString()` helper
- `src/components/AddStockModal.tsx` — lines 37 and 62 (default + reset), line ~330 (`max` attribute)
- `src/components/ImportPortfolioModal.tsx` — line 296 (same pattern)
- Any other `new Date().toISOString().slice(0, 10)` used for user-facing date defaults

**Effort**: 15 minutes  
**Risk**: Low — only affects display default, not stored data

---

## 3. Skip Display Name When Already Set

**Problem**: Users who enter a display name during email/password signup are asked for it again in onboarding step 0. The field is pre-filled but still shown, making onboarding feel repetitive.

**Fix**: In `src/app/onboarding/page.tsx`, in the `StepProfile` rendering (step 0), conditionally hide the display name field when `user?.displayName` is already set and non-empty. Show a greeting instead: "Welcome, {displayName}!" with a small "edit" link to reveal the field.

**Alternative (simpler)**: Just skip focus to the next field (currency) and collapse the display name into a compact read-only line at the top.

**Files**: `src/app/onboarding/page.tsx`  
**Effort**: 15 minutes  
**Risk**: None

---

## 4. Add Error Boundary to Tools Page

**Problem**: No error boundaries exist anywhere in the app. If a dynamic JS chunk fails to load (network issue, ad blocker, bad deploy) or a tab component throws, the entire page crashes with the default Next.js error UI. This is especially bad for first-time users exploring Tools.

**Fix**:

1. Create `src/components/ErrorBoundary.tsx` — a reusable React error boundary component with retry button
2. Wrap each dynamic tab panel in `PortfolioTools.tsx` with the error boundary
3. Add `src/app/(app)/tools/error.tsx` — Next.js route-level error page for the tools segment
4. Optionally add `src/app/(app)/error.tsx` as a global fallback

**Design**: Error boundary shows a card with: error icon, "Something went wrong" message, "Try again" button that resets the boundary, and a "Contact support" link.

**Files**:

- `src/components/ErrorBoundary.tsx` — new
- `src/components/PortfolioTools.tsx` — wrap tab panels
- `src/app/(app)/tools/error.tsx` — new
- `src/app/(app)/error.tsx` — new (optional)

**Effort**: 30 minutes  
**Risk**: None — purely additive

---

## 5. Improve Email Verification Banner

**Problem**: The banner says "Verify your email to unlock billing and data export" which:

1. Makes users think the app is mostly unusable without verification (it's not)
2. Claims "data export" is locked, but CSV export is actually gated by Pro plan, not email verification
3. Doesn't mention that email delivery of price alerts is gated (which IS actually locked)

**Fix**:

- Update `emailVerifyBanner` copy in `src/locales/en.ts` and `src/locales/es.ts`:
  - **New EN**: "Verify your email to enable subscription upgrades and alert email notifications. Everything else works without verification."
  - **New ES**: "Verifica tu email para habilitar suscripciones y notificaciones de alertas por correo. Todo lo demás funciona sin verificación."
- Remove "data export" claim (it's not actually gated by verification)
- Propagate to all other locale files

**Files**: `src/locales/en.ts`, `src/locales/es.ts`, all other locale files  
**Effort**: 10 minutes  
**Risk**: None — just copy change

---

## 6. Add Lightweight Dashboard Tour for New Users

**Problem**: New users land on the dashboard with no guidance beyond the onboarding checklist. There's no visual tour pointing out key areas (portfolio view, sidebar tools, import button, nav items).

**Approach**: A lightweight 3-step tooltip tour that appears on first visit (tracked via localStorage), not a heavy library:

1. **Step 1**: Points to the portfolio area — "This is your portfolio. Add stocks to see them here."
2. **Step 2**: Points to the nav/Tools link — "Explore tools: dividends, performance, tax reports, and more."
3. **Step 3**: Points to the Import nav item — "Import your existing portfolio from 14+ brokers or use AI import."

**Implementation**:

- New `src/components/DashboardTour.tsx` component
- Uses a positioned tooltip with arrow, backdrop highlight, and next/skip buttons
- Renders in `DashboardPortfolioV2.tsx` (desktop) and `MobileDashboard.tsx` (mobile)
- Only shows when `localStorage.getItem('dashboardTourDone')` is null AND user has 0 holdings
- Styled to match the app theme (dark mode aware)
- No external dependencies — pure CSS + React state

**Files**:

- `src/components/DashboardTour.tsx` — new
- `src/components/dashboard-v2/DashboardPortfolioV2.tsx` — import and render
- `src/components/mobile/MobileDashboard.tsx` — import and render
- `src/locales/en.ts`, `src/locales/es.ts` — tour step strings

**Effort**: 45-60 minutes  
**Risk**: Low — dismissible, localStorage-gated, no backend changes

---

## Execution Order

1. **Copyright** (5 min) — trivial fix, high polish impact
2. **Email banner** (10 min) — copy fix, removes confusion
3. **Purchase date** (15 min) — timezone bug fix
4. **Display name** (15 min) — onboarding polish
5. **Error boundary** (30 min) — reliability improvement
6. **Dashboard tour** (45-60 min) — biggest UX lift, do last

Total estimated effort: ~2 hours

---

## Cross-cutting

- **Release notes**: New version entry for these fixes
- **i18n**: Items 2, 3, 5, 6 add or change locale strings — propagate EN + ES at minimum
- **Demo page**: Tour should be gated with `demoMode` check
- **Legal**: Banner copy change should be accurate to actual gating (item 5)

