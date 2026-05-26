# trefolio Design System

Single source of truth for visual tokens, component patterns, voice, and customer definitions.
Referenced by the PM skill for mockups and design reviews, and by `ui-design-system.mdc` for engineer implementation.

The current default app direction is a restrained glass system. Use this doc together with `knowledge/design-docs/glass-visual-system.md` when reviewing or mocking app UI.

---

## A. Customers and Personas

### Primary — "Marta"

| Attribute | Detail |
|---|---|
| Profile | Beginner-to-intermediate European retail investor, 25-45 years old |
| Portfolio | 5-50 stocks/ETFs across 1-2 exchanges |
| Devices | Phone (primary), desktop (secondary) |
| Goals | Understand how her portfolio is performing, feel confident she is on track, spend minimal time managing it |
| Frustrations | Existing tools are complex, cluttered, or English-only; spreadsheets break; broker apps only show one account |
| Tier fit | Starts on **Folio** (free), upgrades to **Bifolio** or **Trefolio** once she wants alerts, AI analysis, or fundamentals |
| Jobs to be done | Check portfolio value, see gains/losses at a glance, import holdings from broker, compare against a benchmark |

### Secondary — "Jens"

| Attribute | Detail |
|---|---|
| Profile | European expat, 30-50, intermediate investor |
| Portfolio | Multi-currency holdings across 2-3 exchanges (e.g., XETRA + NYSE + AMS) |
| Devices | Desktop (primary), phone (secondary) |
| Goals | See everything in one base currency (EUR), track FX impact, understand real performance after conversion |
| Frustrations | Most tools don't handle multi-currency well; manual FX tracking is error-prone |
| Tier fit | Likely **Bifolio** or **Trefolio** — needs more than 15 holdings and values CSV export |
| Jobs to be done | Add holdings in multiple currencies, see consolidated EUR value, export tax-ready data |

### Tertiary — "Lucia"

| Attribute | Detail |
|---|---|
| Profile | Non-English-speaking European investor relying on localized UI |
| Portfolio | Similar to Marta, but language barrier is the key differentiator |
| Devices | Phone-first |
| Goals | Use a portfolio tracker that speaks her language and explains things simply |
| Frustrations | English-only tools are unusable; machine-translated UIs feel broken |
| Tier fit | Any tier — language support is available on all plans |
| Jobs to be done | Same as Marta, but entirely in her native language (one of 35 supported) |

### Segment-to-Tier Mapping

| Tier | Name | Price | Holdings | AI Calls | Alerts | Target |
|---|---|---|---|---|---|---|
| Free | **Folio** | 0 EUR | 15 | 5/month | 2 (in-app) | Marta getting started |
| Starter | **Bifolio** | 2.99 EUR/month (23.99 EUR/year) | 50 | 20/month | 10 + email/push | Marta or Jens who want more |
| Pro | **Trefolio** | 7.99 EUR/month (59.99 EUR/year) | Unlimited | Unlimited | Unlimited | Jens, power users, fundamentals |

---

## B. Voice and Language

### Tone

Friendly, approachable, jargon-free — like explaining stocks to a friend.

### Tagline

"Your portfolio. Understood."

### Writing Rules

- **Short sentences.** Benefit-first copy. Lead with what the user gets, not what the system does.
- **No finance jargon** in primary UI. Avoid "CAGR", "alpha", "Sharpe ratio", "P/E ratio" in headlines or nav. Acceptable in Pro tools if accompanied by a tooltip or plain-language explanation.
- **Active voice.** Second person. "Your portfolio gained 4.2%" not "A gain of 4.2% was recorded."
- **Emoji:** Never in data cells, tables, or financial figures. Sparingly acceptable in onboarding, empty states, and marketing copy.
- **Numbers:** Always formatted with locale-aware helpers (`formatCurrency`, `formatPercent` from `src/lib/utils.ts`). Never hardcode currency symbols or decimal separators.
- **i18n:** Every user-facing string must go through the i18n system (`src/lib/i18n.tsx`, locale files in `src/locales/`). No hardcoded English in components.

### Naming Conventions

- **Tier names:** Folio, Bifolio, Trefolio — always capitalized when referring to the plan name.
- **Product name:** trefolio — always lowercase in running text. Capitalize only at the start of a sentence.
- **Hardware:** trefolio Leaf — "Leaf" capitalized, "trefolio" lowercase.

### Copy Patterns

| Context | Pattern | Example |
|---|---|---|
| Error messages | Plain language, actionable, no blame | "We couldn't load your portfolio. Try refreshing." |
| Empty states | Encouraging, guide toward next action | "No holdings yet. Add your first stock to get started." |
| Upgrade prompts | Benefit-first, low pressure | "Unlock unlimited AI analysis with Trefolio." |
| Confirmations | Brief, positive | "Holding added successfully." |
| Tooltips | One sentence, explains why not just what | "Withholding tax reduces your net dividend based on the stock's country." |
| Loading | Descriptive when possible | "Loading your portfolio..." not just a spinner |

---

## C. Color System

### Semantic Tokens (CSS Variables)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | soft slate-blue | deep navy | base page color |
| `--foreground` | deep blue-slate | near-white | primary text |
| `--card` | translucent white | translucent navy | main card surface |
| `--border` | soft frosted border | soft frosted border | default separators |
| `--muted` | muted slate | muted blue-gray | secondary text |
| `--gain` | `#10b981` (emerald-500) | `#10b981` | Positive values |
| `--loss` | `#ef4444` (red-500) | `#ef4444` | Negative values |
| `--accent` | teal-emerald | aqua-teal | brand accent, CTAs |
| `--surface-strong` | high-opacity frosted white | high-opacity frosted navy | hero cards / toolbars |
| `--surface-soft` | light translucent white | subtle translucent white | dense card internals |
| `--surface-overlay` | opaque frosted shell | opaque frosted shell | sheets / drawers / modals |
| `--glass-blur` | medium blur | medium blur | shared blur intensity |

### Functional Colors

| Role | Tailwind Classes (light / dark) | Hex |
|---|---|---|
| **Brand accent** | `bg-emerald-500`, `text-emerald-500` | `#10b981` |
| **Gain / positive** | `text-emerald-600 dark:text-emerald-400` | `#059669` / `#34d399` |
| **Gain background** | `bg-emerald-50 dark:bg-emerald-500/10` | — |
| **Loss / negative** | `text-red-500 dark:text-red-400` | `#ef4444` / `#f87171` |
| **Loss background** | `bg-red-50 dark:bg-red-500/10` | — |
| **Warning** | `text-amber-500 dark:text-amber-400` | `#f59e0b` / `#fbbf24` |
| **AI / Premium** | `text-violet-500`, `bg-violet-500` | `#8b5cf6` |
| **Nav (constant)** | `bg-nav-bg text-nav-text` | `#0f172a` / `#f1f5f9` |
| **Primary text** | `text-gray-900 dark:text-white` | — |
| **Secondary text** | `text-gray-500 dark:text-slate-400` | — |
| **Muted text** | `text-gray-400 dark:text-slate-500` | — |
| **Card border** | `border-gray-100 dark:border-slate-700` | — |
| **Input border** | `border-gray-200 dark:border-slate-600` | — |

### Color Rules

- Always pair light classes with `dark:` variants for text, backgrounds, and borders.
- Never convey meaning by color alone — always add an icon, arrow, or +/- sign alongside gain/loss colors.
- Use `dark:bg-{color}-500/10` for soft colored backgrounds in dark mode, not `dark:bg-{color}-900`.
- Default theme uses layered glass. Alternate themes may reduce or disable the effect, but should still consume the same token model.
- Overlays and sheets must be more opaque than regular cards.

---

## D. Typography

### Font Families

| Role | Family | CSS Variable | Fallback |
|---|---|---|---|
| Body & headings | Geist Sans | `var(--font-geist-sans)` | `system-ui, sans-serif` |
| Numbers & code | Geist Mono | `var(--font-geist-mono)` | `ui-monospace, monospace` |

> Note: The commercialization plan references Inter and JetBrains Mono. The codebase ships Geist. This document reflects what is actually deployed.

### Type Scale

| Class | Use |
|---|---|
| `text-2xl` / `text-3xl` | Page titles, hero headings |
| `text-xl` | Section headings, card titles |
| `text-lg` | Subheadings, prominent labels |
| `text-base` | Body text, descriptions |
| `text-sm` | Secondary labels, table cells, metadata |
| `text-xs` | Badges, timestamps, fine print |

### Font Weights

| Weight | Class | Use |
|---|---|---|
| Regular (400) | — | Body text |
| Medium (500) | `font-medium` | Buttons, labels, nav items |
| Semibold (600) | `font-semibold` | Card titles, section headings |
| Bold (700) | `font-bold` | Emphasis, portfolio totals, hero text |

### Text Rendering

- Always apply `antialiased` on the body (already set in `layout.tsx`).
- Use `tabular-nums` on financial figures for aligned decimal points.

---

## E. Spacing and Layout

### Page Layout

- Max content width: `max-w-7xl mx-auto px-4 sm:px-6`
- Page background: semantic gradient from globals, not a flat `bg-gray-50`
- Mobile bottom tab bar: `pb-14 sm:pb-0`

### Spacing Scale

| Pattern | Tailwind | Use |
|---|---|---|
| Tight | `gap-2`, `space-y-2` | Inline groups, compact lists |
| Standard | `gap-3`, `gap-4`, `space-y-4` | Card content, form fields |
| Section | `gap-6`, `space-y-6` | Between sections, card groups |
| Page | `gap-8`, `space-y-8` | Top-level page sections |

### Card Padding

- Standard: `p-5`
- Compact: `p-4`
- Large: `p-6` (modals, full-page sections)

### Border Radius

| Token | Class | Use |
|---|---|---|
| Large | `rounded-[24px]` to `rounded-[30px]` | Hero cards, major containers |
| Medium | `rounded-2xl` | Buttons, inputs, compact cards |
| Full | `rounded-full` | Pills, badges, avatars |

### Responsive Breakpoints

| Breakpoint | Prefix | Typical Use |
|---|---|---|
| < 640px | (default) | Mobile — single column, tab bar visible |
| >= 640px | `sm:` | Tablet — sidebar appears, tab bar hidden |
| >= 768px | `md:` | Small desktop — multi-column grids |
| >= 1024px | `lg:` | Desktop — full layout |
| >= 1280px | `xl:` | Wide desktop — max-w-7xl content |

---

## F. Component Catalog

### Card

```
.card
```

Translucent semantic card surface with softened border, blur, and depth from globals.

Use for every content container on the dashboard. Prefer semantic surface tokens and depth over hard gray fills.

### Buttons

| Variant | Class | Appearance |
|---|---|---|
| Primary | `.btn-primary` | Teal/emerald glass-aware CTA with white text |
| Secondary | `.btn-secondary` | Soft frosted secondary action |
| Danger | `.btn-danger` | Red-500 bg, white text, shadow-sm, hover:red-600 |

All buttons: `font-medium px-4 py-2 rounded-lg transition-colors`.

### Inputs and Selects

Styled globally in `@layer base`:

- Light: `bg-white border-gray-300 text-gray-900 placeholder:text-gray-400`
- Dark: `dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500`
- Focus: `focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500`
- Shape: `rounded-lg px-3 py-2`

### Modals

- Backdrop: `fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm`
- Content: `bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl`
- Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Behavior: Focus trap via `useFocusTrap`, Escape to close, return focus to trigger on dismiss

### Pill Selectors

- Active: `bg-emerald-500 text-white`
- Inactive: `bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300`
- Shape: `rounded-full px-3 py-1 text-sm font-medium`

### Badges

- Shape: `rounded-full` with light background + matching text
- Dark mode: `dark:bg-{color}-500/10 dark:text-{color}-400 dark:border-{color}-500/20`
- Common colors: emerald (positive), red (negative), amber (warning), violet (Pro/AI)

### Tables

- Container: inside a `.card`
- Header: `bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700`
- Rows: hover state, `border-b border-gray-100 dark:border-slate-700`
- Text: `text-sm`, right-align numerical columns

### Drawers

- Slide-out panel: `role="dialog"`, slides from right
- Backdrop + content styling matches modals
- Used for stock detail views (`StockDetailDrawer`)

### Charts (Recharts)

- Axis tick color: `isDark ? "#94a3b8" : "#9ca3af"` (from `useTheme()`)
- Axis line color: `isDark ? "#334155" : "#e5e7eb"`
- Tooltip: `bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-lg`
- Series colors: emerald, blue, violet, amber, red — these work in both themes without change
- Grid: subtle, use axis line color at reduced opacity

### Empty States

Pattern: centered icon + heading + description + CTA button.

- Icon: muted color, 48px
- Heading: `text-lg font-semibold text-gray-900 dark:text-white`
- Description: `text-sm text-gray-500 dark:text-slate-400`
- CTA: `.btn-primary`

### Loading States

- Skeleton shimmer: `animate-value-shimmer` (emerald-tinted gradient)
- Pulse: `animate-live-pulse` for live indicators
- Progress: `animate-progress-bar` for loading bars
- Dot bounce: `animate-dot-bounce` for inline loading (e.g., AI thinking)

---

## G. Animation

### Custom Animations

| Class | Effect | Use |
|---|---|---|
| `animate-slide-up` | Fade + slide from below (0.35s ease-out) | Card/section entrance |
| `animate-live-pulse` | Opacity pulse (1.5s infinite) | Live data indicators |
| `animate-value-shimmer` | Emerald gradient sweep (1.5s infinite) | Skeleton loading |
| `animate-progress-bar` | Horizontal slide (1.2s infinite) | Progress indicators |
| `animate-logo-breathe` | Scale + glow pulse (2s infinite) | Logo on loading screens |
| `animate-dot-bounce` | Bounce with opacity (1.4s infinite) | AI "thinking" dots |
| `ai-cta-shimmer` | Emerald-violet gradient border (4s infinite) | AI feature CTAs |
| `ticker-scroll` | Horizontal scroll (45s linear infinite) | Market ticker bar |

### Motion Rules

- All animations are wrapped in `@media (prefers-reduced-motion: no-preference)`.
- When `prefers-reduced-motion: reduce`, all animations are disabled via explicit overrides in `globals.css`.
- No content flashes more than 3 times per second.
- Ticker auto-pauses on hover.

---

## H. Iconography

### Approach

- **Primary method:** Inline SVGs — `24x24`, `viewBox="0 0 24 24"`, `stroke="currentColor"`, `fill="none"`, `strokeWidth={1.5}` or `{2}`.
- **Secondary:** `lucide-react` for standard icons (used in profile, install prompt, widgets).
- **Custom icons:** `TierIcon` component renders leaf variants for Folio/Bifolio/Trefolio tiers. Brand logo is a custom SVG in `AppNav`.

### Rules

- Icon-only buttons must always have `aria-label`.
- Decorative icons use `aria-hidden="true"`.
- Informative SVGs use `role="img"` with `aria-label`.
- Prefer `currentColor` for stroke/fill so icons inherit text color and respect themes.

---

## I. Accessibility Baseline

Full review process is defined in the `accessibility-reviewer` skill. These are the hard constraints that apply to every design decision:

### Minimum Standards

- **WCAG 2.1 AA** compliance on all user-facing surfaces.
- **Text contrast:** 4.5:1 minimum for normal text, 3:1 for large text (>=18px bold or >=24px).
- **Focus indicators:** Visible on all interactive elements. Use `focus-visible:ring-2 focus-visible:ring-emerald-500`. Never use `outline-none` without a visible replacement.
- **Keyboard navigation:** All interactive elements reachable via Tab/Shift+Tab/Enter/Space/Escape. Modals trap focus.
- **Screen readers:** All images have `alt` text (or `alt=""` if decorative). Dynamic content uses `aria-live` regions. Route changes announce page title.
- **Color independence:** Never use color as the sole indicator of meaning (e.g., gain/loss always includes +/- or arrow icons).
- **Touch targets:** Minimum 44x44px on mobile.
- **Zoom:** Content usable at 200% zoom without horizontal scroll. Never disable pinch-to-zoom.
- **Motion:** Respect `prefers-reduced-motion` — all animations disabled when user opts out.

### Dark Mode Accessibility

Both themes must independently meet contrast requirements. Test every color pairing in both light and dark modes.

---

## J. Theme Management

- Theme toggle via `useTheme()` hook from `src/lib/theme-context.tsx`.
- Stored in `localStorage` key `trefolio-theme`.
- Default: follows `prefers-color-scheme: dark` if no stored preference.
- Implementation: `.dark` class on `document.documentElement`.
- Meta theme color: `#10b981` (emerald).
- Auth pages (`/login`, `/signup`, etc.) must wrap with `<ThemeProvider>` since they are outside the main layout.
