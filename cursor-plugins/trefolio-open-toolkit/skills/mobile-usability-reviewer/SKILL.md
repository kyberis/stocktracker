---
name: mobile-usability-reviewer
description: Reviews UI changes for mobile usability — responsive layout, touch targets, viewport fitting, scroll behavior, navigation patterns, and input handling. Use when any page, component, layout, or navigation is added or modified to ensure it works on mobile (375px–428px) and tablet (768px) viewports.
---

# Mobile Usability Reviewer

## Mission

Ensure every user-facing page and component is fully usable on mobile devices. Catch layout overflow, unreachable navigation, cramped touch targets, and broken interactions before they ship.

## When To Apply

Apply this skill whenever a change touches:

- New or modified pages, layouts, or route groups
- Navigation components (sidebars, tab bars, breadcrumbs, back buttons)
- Multi-pane layouts (split views, sidebars + content, master-detail)
- Forms, inputs, selects, or interactive controls
- Modals, drawers, bottom sheets, or overlays
- Tables, grids, or card layouts
- Fixed/sticky positioned elements
- Scroll containers or overflow areas
- Any component using responsive breakpoints (`hidden`, `md:`, `lg:`, etc.)

## Reference Viewports

| Device class | Width | Use for |
|-------------|-------|---------|
| Small phone | 375px | Compact Android / small iPhone |
| Standard phone | 390–428px | Common iPhone / Pixel |
| Tablet | 768px | Small tablets |
| Desktop | 1280px | Baseline desktop |

## Review Checklist

### 1) Viewport Fitting

- No horizontal scroll on viewports 375px and wider unless intentional (e.g. data table scroll region).
- Content must not overflow `100vw`. Watch for fixed widths on flex children without shrink/min-width discipline.
- Height layouts using `dvh` / `screen` must account for mobile browser chrome and any fixed bottom navigation.
- Side-by-side layouts should collapse to one column or use list→detail navigation below your chosen breakpoint.

### 2) Navigation

- Every primary destination available on desktop must be reachable on mobile (bottom bar, hamburger, or in-page links).
- Detail views opened from lists should offer a clear back affordance.
- Avoid dead-end screens.

### 3) Touch Targets

- Interactive controls: minimum **44×44px** touch area (48×48px preferred).
- Adequate spacing between adjacent targets (≥8px) to reduce mis-taps.

### 4) Text & Readability

- Body text: prefer ≥14px for primary content; reserve 12px for secondary/meta only.
- Avoid truncating essential labels; allow wrapping where possible.

### 5) Forms & Input

- Inputs full-width on small viewports where appropriate.
- Ensure focused inputs stay visible above the virtual keyboard (scroll into view, bottom padding / safe area).

### 6) Scroll & Overflow

- Avoid nested scroll traps; use `overscroll-behavior` where needed.
- Sticky headers must not consume excessive vertical space on short viewports.

### 7) Modals & Overlays

- Prefer full-width or bottom sheets on narrow screens over tiny centered dialogs.
- Lock background scroll when modal open when your stack supports it.

### 8) Performance

- Avoid rendering two full layout trees and hiding one with CSS; prefer responsive composition.
- Lazy-load heavy below-the-fold content; use skeletons to reduce layout shift.

### 9) Native or Hybrid Shells

If the app runs inside a WebView or Capacitor-style wrapper:

- Respect safe-area insets.
- Do not assume browser chrome; provide in-app navigation.

## Common Responsive Patterns

| Desktop pattern | Mobile approach |
|----------------|-----------------|
| Sidebar + content | Hide sidebar; expose nav via bottom tabs, drawer, or top bar |
| Master–detail side by side | List full-width; tap opens full-screen detail with back |
| Multi-column grids | Collapse to 1–2 columns |
| Wide data tables | Horizontal scroll region or card rows |

## Output Format

```
## Mobile Usability Review — [Page/Component Name]

### Viewport: 375px (phone)
- [ ] FAIL: [issue]
- [x] PASS: [area]

### Viewport: 768px (tablet)
- [ ] FAIL: ...
- [x] PASS: ...

### Summary
- Critical issues: N
- Warnings: N
- Recommendation: SHIP / FIX BEFORE SHIP / BLOCK
```

## Severity Levels

| Level | Definition | Action |
|-------|------------|--------|
| **Critical** | Broken navigation, unreachable content | Fix before ship |
| **Warning** | Suboptimal but usable | Fix same PR or follow-up |
| **Info** | Enhancement | Backlog |
