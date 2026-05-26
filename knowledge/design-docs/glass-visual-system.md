# Glass Visual System

Default trefolio visual language as of the app-wide glass rollout.

## Why this exists

The old guidance described trefolio as a plain light/dark fintech dashboard with an emerald accent. That is no longer enough to explain how the default UI should feel or how alternate themes should stay compatible.

The new baseline is a restrained glass system:

- layered translucent surfaces
- strong semantic tokens in `src/app/globals.css`
- higher-opacity overlays than cards
- chart readability prioritized over decoration
- mobile/native surfaces kept simpler than desktop hero cards

This doc is the system of record for app-wide glass behavior.

## Scope

Applies to:

- authenticated app shell
- dashboard and dashboard-adjacent cards
- mobile tab bar, bottom sheets, and native shell
- shared primitives like `.card`, buttons, inputs, and overlays

Does not require alternate premium themes to visually match the default theme exactly. It requires parity of structure, access, and readability.

## Core principles

1. Glass is a hierarchy, not a blanket effect.
   Use stronger glass on hero cards and nav chrome, softer glass on dense data cards, and more opaque surfaces for modals, sheets, menus, and drawers.

2. Readability wins over style.
   Charts, tables, inputs, and financial numbers must remain legible before any decorative blur or shine is added.

3. Tokens first.
   Shared surfaces must inherit from semantic CSS variables in `src/app/globals.css`, not from one-off gray/slate utility combinations.

4. Alternate themes are compatibility layers.
   `canvas`, `terminal`, and `studio` keep their identity, but they still consume the same component structure and semantic tokens.

5. Mobile is calmer.
   On phone widths, reduce visual density. Keep touch targets >= 44x44, avoid stacked translucent layers, and prefer bottom sheets over centered cards.

## Token model

Primary tokens live in `src/app/globals.css`:

- `--card`, `--card-hover`, `--border`
- `--surface-strong`, `--surface-soft`, `--surface-overlay`
- `--surface-highlight`, `--surface-highlight-strong`
- `--glass-blur`, `--glass-saturation`
- `--glass-shadow`, `--glass-shadow-strong`
- `--page-gradient`, `--page-background`, `--shell-background`
- `--focus-ring`

These tokens drive:

- `.card`
- `.glass-panel`
- `.glass-toolbar`
- `.glass-overlay`
- `.btn-primary`, `.btn-secondary`, `.btn-danger`
- global input/select/textarea styling

## Surface hierarchy

Use this order when choosing a surface:

1. `glass-overlay`
   For modals, bottom sheets, drawers, and anything above page content.
   Must be the most opaque layer in the stack.

2. `glass-toolbar`
   For nav chrome, sticky bars, command strips, mobile headers, and native app bars.

3. `card`
   Default content container.

4. Nested mini-panels inside cards
   Use subtle tinted fills or `bg-white/10` style accents inside a `card`; do not nest another heavy glass card unless the hierarchy truly needs it.

## Theme strategy

### Default

Default is the primary glass language. It supports light/dark mode, but both modes should feel like the same family:

- layered gradients
- softened borders
- generous radii
- translucent shells
- clear focus rings

### Canvas

Canvas stays light, spacious, and softer. It uses the same semantic tokens with lower blur and brighter surfaces.

### Terminal

Terminal keeps dense, near-flat, low-radius styling. It explicitly disables glass-heavy behavior via token overrides.

### Studio

Studio remains premium and dark, but now aligns more closely with the same token vocabulary instead of being a one-off glass experiment.

## Component rules

### Shell and navigation

- App shell backgrounds come from `--page-gradient`, `--page-background`, and `--shell-background`.
- Sticky nav and tab bars use `glass-toolbar` or `glass-overlay`.
- Safe areas must be preserved in native/mobile shells.

### Cards

- Prefer `.card` over hard-coded `bg-white` / `dark:bg-slate-*`.
- Do not add extra blur utilities on every card. Let the token system supply it.
- Use stronger highlights only on the hero chart or high-priority promo cards.

### Inputs and buttons

- Shared primitives should inherit from globals.
- Minimum hit target on primary interactive controls: 44x44.

### Charts

- The chart plot area must stay readable; decorative overlays belong around the chart, not on top of the data.
- Axis, grid, cursor, tooltip, and session overlays should use semantic variables or theme-aware values.
- Benchmark chips, range selectors, and mode toggles can use glass pills.

### Mobile sheets

- Use `glass-overlay`.
- Rounded top corners are OK; centered floating cards are not the default mobile pattern.
- Lock body scroll while open.

## Accessibility and motion

- Maintain WCAG AA contrast for text and controls on all translucent surfaces.
- Focus states must remain visible on mixed/light/dark backdrops.
- Use icon + sign + text for gain/loss where possible; never color alone.
- Respect `prefers-reduced-motion`; blur is fine, but avoid gratuitous animated glow.

## Demo and landing constraints

- If dashboard data needs change, keep `/demo` aligned per `.cursor/rules/demo-page.mdc`.
- If a future feature adds a new public-facing capability, re-evaluate landing screenshots/copy per `.cursor/rules/landing-page.mdc`.
- A visual reskin alone does not automatically require landing changes, but public screenshots should not drift too far from the product.

## Files that usually change together

- `src/app/globals.css`
- `src/app/(app)/app-layout-client.tsx`
- `src/components/AppNav.tsx`
- `src/components/SidebarNav.tsx`
- `src/components/MobileTabBar.tsx`
- `src/components/NativeShell.tsx`
- `src/components/dashboard-v2/*`
- `src/components/portfolio-v2/PortfolioValueChart.tsx`

## Delivery checklist

- default theme matches the glass direction without breaking dark/light mode
- canvas, terminal, and studio still render the same product structure
- desktop, tablet, and mobile keep safe spacing and clear hit targets
- overlays are more opaque than content cards
- charts remain readable
- `/demo` still renders
- release notes updated for user-facing visual changes
