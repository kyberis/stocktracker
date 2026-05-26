# FRONTEND.md — UI, theming, and UX principles

## Framework

- Next.js 14 App Router (React 19).
- Tailwind CSS with custom themes configured in [`tailwind.config.ts`](../tailwind.config.ts).
- Recharts for all charts.
- Lucide for icons.
- SWR for client-side data fetching; React Context for app-wide state.

## Themes

Four themes (listed in `LayoutTheme`): `default`, `canvas`, `terminal`, `studio`.
The default theme is the primary glass-based visual direction. `canvas`,
`terminal`, and `studio` stay supported through token overrides, not through
separate component trees. See
[`knowledge/design-docs/glass-visual-system.md`](design-docs/glass-visual-system.md).

Mode behavior is not identical across themes:

- `default`: light/dark toggle
- `canvas`: forced light
- `terminal`: forced dark
- `studio`: forced dark

Theme parity is enforced by the
[`theme-parity`](../.cursor/skills/theme-parity/SKILL.md) skill. If a component
looks broken in one theme, it ships broken for everyone. Test all four whenever
you change UI.

## Surface system

- Shared surfaces inherit from semantic tokens in `src/app/globals.css`.
- Prefer `.card`, `.glass-toolbar`, and `.glass-overlay` over ad-hoc `bg-white`
  / `dark:bg-slate-*` combinations.
- Overlays, sheets, and drawers must be more opaque than decorative cards.
- Charts may live inside glass containers, but the plotting area itself must
  remain readability-first.

## Dashboard shell

The app UI is mounted under `src/app/(app)/` through
[`src/app/(app)/layout.tsx`](../src/app/(app)/layout.tsx) which composes:

- `PortfolioProvider` ([`src/lib/portfolio-context.tsx`](../src/lib/portfolio-context.tsx))
- `PortfolioCommandProvider` ([`src/contexts/portfolio-command-context.tsx`](../src/contexts/portfolio-command-context.tsx))
- `FeatureFlagProvider` ([`src/lib/feature-flag-context.tsx`](../src/lib/feature-flag-context.tsx))
- `AnalyticsProvider` ([`src/components/AnalyticsProvider.tsx`](../src/components/AnalyticsProvider.tsx))
- `AppNav`, `CapacitorBridge`, `CookieConsent`, `InstallPrompt`

Any new provider that the dashboard depends on MUST also be added to the demo
shell at [`src/app/demo/demo-shell.tsx`](../src/app/demo/demo-shell.tsx) (see
[`.cursor/rules/demo-page.mdc`](../.cursor/rules/demo-page.mdc)).

## Mobile-first

- Layouts are responsive, validated at 375px, 390px, 428px, 768px, 1024px, 1440px.
- Touch targets ≥ 44x44px.
- Bottom-sheet modals on mobile; centered dialogs on desktop.
- On mobile, keep glass calmer than desktop. Dense card stacks should not become
  visually noisy just because the desktop hero card is more decorative.
- See [`mobile-usability-reviewer`](../.cursor/skills/mobile-usability-reviewer/SKILL.md)
  skill for the checklist.

## Accessibility (WCAG 2.1 AA)

- Semantic HTML first; ARIA only when necessary.
- All interactive elements keyboard-reachable.
- Focus outlines visible on all themes.
- Screen-reader labels on icon-only buttons.
- Color contrast checked with the [`accessibility-reviewer`](../.cursor/skills/accessibility-reviewer/SKILL.md)
  skill.

## i18n

- 35 European UI locales under [`src/locales/`](../src/locales).
- Language switcher: [`LanguageSwitcher.tsx`](../src/components/LanguageSwitcher.tsx).
- Blog content per-locale in `src/lib/blog-posts-<locale>.ts`.
- Emails localized in [`src/lib/email-i18n/`](../src/lib/email-i18n).

## Money display

- Use shared formatters — do not roll your own `toFixed(2)` calls.
- Base currency in storage is EUR; display currency is the user's preference.
- Use `formatCompactNumber` for large values on mobile/charts.
- Negative values: use red and parentheses depending on context; be consistent.

## Paywall patterns

- `BlurredProSection` for Pro-only sections the user can see a preview of.
- `DashboardUpgradeNudge` / `DataUpgradeNudge` for inline upsell.
- Server-side tier gating via `requireSubscriptionFeature()` — never trust the
  client.

## Empty / loading / error states

- `EmptyState` for "no data yet" (with a CTA, not just a message).
- Skeleton rows for tables; shimmer bars for charts.
- `ErrorBoundary` wrapping the dashboard; per-widget fallbacks for the chart.

## Chart conventions

See [`engineer-charts`](../.cursor/skills/engineer-charts/SKILL.md). Highlights:

- `PortfolioValueChart` consumes `portfolio_snapshots` + live quote overlay.
- Range selector: 1D / 5D / 1M / 3M / 6M / YTD / 1Y / ALL.
- Market-session rendering differentiates pre-market, RTH, after-hours.
- Spike attribution explains sudden value changes via
  [`src/lib/chart-chat-context.ts`](../src/lib/chart-chat-context.ts).
- Benchmarks overlay: SPX, NDX, DJI, SX5E (toggled per user).
- Tooltip: [`ChartTooltip`](../src/components/ChartTooltip.tsx).

## Animation & motion

- Prefer CSS transitions over JS animations.
- Respect `prefers-reduced-motion`.
- Celebratory UI (e.g., `GoalCelebration`) is opt-out, not opt-in.

## Icons and logos

- Lucide first.
- Brand logo: [`CloverToLogo.tsx`](../src/components/CloverToLogo.tsx).
- Broker logos in `public/broker-logos/` (slug-matched).

## Ad and promo slots

- AdSense is Free-tier only; Pro users never see ads.
- `AdSlot` wraps slots and handles consent + tier gating.
- Promo banners: `LeafPromoBanner` (device waitlist), configurable banners via
  `/api/admin/promo-banner`.

## Landing page

- [`src/app/landing/page.tsx`](../src/app/landing/page.tsx) is the public
  marketing page. Do NOT bloat it. See
  [`.cursor/rules/landing-page.mdc`](../.cursor/rules/landing-page.mdc).
- Screenshots live in `public/screenshots/`, 1280x800, dark theme.

## Cookie consent

- GDPR-compliant banner via `CookieConsent`.
- Consent Mode v2 gates GA/Meta Pixel tags.
- See [`knowledge/SECURITY.md`](SECURITY.md) for PII rules.
