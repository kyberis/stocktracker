# Agent dock

> Persistent Warren + Clara chrome: expanded dock on desktop, minimized FAB → sheet on mobile.

## 1. Summary

Authenticated web app chrome that keeps **Warren**, **Clara**, market alerts, **Feedback**, and (Pro) **AI Support** in one bottom-right control. Desktop shows the dock expanded; mobile starts as a `W·C` FAB and expands on tap. Replaces page-local Feedback FABs that collided with the market-move toast.

## 2. Status

- **Tier:** Free (Warren, Clara, Feedback, alerts). Support Chat remains Pro + admin-enabled.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-homepage`](../../.cursor/skills/engineer-homepage/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Context | `src/contexts/agent-chrome-context.tsx` | Open/close Warren, Clara, Feedback, Support, alerts |
| UI | `src/components/AgentDock.tsx` | Desktop dock + mobile FAB/sheet |
| Host | `src/components/AgentChromeHost.tsx` | Dock + drawers/modals |
| Shell | `src/app/(app)/app-layout-client.tsx` | Default + Studio themes |
| Demo | `src/app/demo/demo-shell.tsx` | Dock with Warren/Clara → `/signup` |
| Toast | `src/components/MarketMoveToast.tsx` | Badge count into dock; no collapsed chip when dock is present |
| Mock | `public/mocks/floating-chrome-mobile-dock-b.html` | Min → expand reference |

## 4. Data model

No new tables. Support Chat still uses `/api/support-chat/config`. Alert count comes from existing ticker-bar movers + cached quotes.

## 5. API surface

No new routes. Reuses:

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/support-chat/config` | session | Pro UI gate | Enabled + welcome |
| GET | `/api/clara/status` | session | Free | Clara linked status (modal) |
| POST | `/api/warren/chat` | session | quota | Warren drawer |
| POST | `/api/feedback` | session | Free | Feedback modal |

## 6. UI surface

- Desktop (`sm+`): `[Warren][Clara] | [⚡][Support?][Feedback]` at `bottom-6 right-6`.
- Mobile: FAB `bottom-20 right-4` above `MobileTabBar`; tap opens sheet (scrim, Escape, ≥44px targets).
- Warren: global `WarrenDrawer` (no selection context). Page triggers (Home card, Holdings Explorer) stay local.
- Clara: `ClaraLandingModal` → sister app tab.
- Alerts: dock badge; expanded `MarketMoveToast` panel sits above the dock.
- Not mounted on `/office`, public `/analisis`, or Capacitor `NativeShell`.

## 7. Business logic

- `demoMode`: Warren/Clara are links to `/signup`; Feedback and Support hidden.
- Support chip: `user.plan === "pro"` **and** `supportChatEnabled`. Escalate closes chat and opens Feedback.
- Market toast auto-expands once per day then collapses to the dock badge (no overlapping chip).

## 8. External dependencies

- Clara public URL (`NEXT_PUBLIC_CLARA_URL` / clara.trefolio.com) via existing modal.
- None new.

## 9. Currency / FX / tax implications

- N/A. Market-move percents are display-only. Not financial advice.

## 10. i18n

- Keys: `agentDockSheetLabel`, `agentDockOpenMenu`, `agentDockCloseMenu`, `agentDockCloseHint`.
- Reuses `warrenName`, `claraName`, `feedback`, `supportChatTitle`, `marketAlertTitle`.
- EN + ES authored; other locales English fallback until translated.

## 11. Permissions / tier gating / rate limits

- Free: Warren (quota), Clara, Feedback, alerts.
- Pro: Support Chat when admin-enabled.
- No new rate limits.

## 12. Telemetry

GA via `useTrack`:

- `agent_dock_open`
- `agent_dock_warren`
- `agent_dock_clara`
- `agent_dock_feedback`
- `agent_dock_alerts`
- `agent_dock_support`

Existing `clara_cta_opened` / `support_chat_opened` still fire from those surfaces.

## 13. Edge cases & gotchas

- Two Warren drawers can exist (page-local + dock). Dock does not steal Holdings Explorer selection context.
- Satisfaction survey detects `[data-agent-dock]` so it sits above the dock.
- Mobile sheet closes before opening Warren/Clara/Feedback/alerts.
- Native app: v1 skipped; no dock in `NativeShell`.

## 14. Tests

- Unit: `src/lib/agent-dock-badge.test.ts`
- E2E: `e2e/agent-dock.spec.ts` (desktop dock, mobile expand, demo signup CTAs)

## 15. Related skills and rules

- Skills: `engineer-homepage`, `engineer-dashboard`, `accessibility-reviewer`, `theme-parity`, `legal-advisor`
- Rules: landing-page (chrome not landing-worthy), demo-page, release-notes, pre-pr-checks
- Related specs: [clara-home-cta](clara-home-cta.md), [feedback](feedback.md), [agent-office](agent-office.md), [demo-page](demo-page.md), [unified-homepage](unified-homepage.md)

## 16. Open questions / planned work

- Unify page-local Warren drawers into the chrome context.
- Will chip on the dock.
- Native Capacitor shell.
