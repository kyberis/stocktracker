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
- Any component using `hidden` / `block` responsive breakpoints

## Reference Viewports

| Device class | Width | Use for |
|---|---|---|
| Small phone | 375px | iPhone SE / Android compact |
| Standard phone | 390–428px | iPhone 14-16 / Pixel |
| Tablet | 768px | iPad Mini / small tablets |
| Desktop | 1280px | Baseline desktop |

## Review Checklist

Run through each section below. Report any violations using the output format at the bottom.

### 1) Viewport Fitting

- No horizontal scroll on any viewport 375px and wider. Check for elements with fixed widths (`w-72`, `w-[260px]`, `w-[720px]`) that don't have responsive alternatives.
- Content must not overflow `100vw`. Look for `flex` containers where children have `shrink-0` without a mobile alternative.
- Height-based layouts (`h-dvh`, `h-screen`, `calc(100dvh - ...)`) must account for mobile browser chrome and the app's `MobileTabBar` (56px).
- Side-by-side layouts (split views, sidebar + content) MUST collapse to a single column or use a show/hide pattern below `md` or `lg`.

### 2) Navigation Accessibility

- Every page reachable via desktop sidebar/nav must also be reachable on mobile via `MobileTabBar`, `NetworkMobileNav`, or in-page links.
- Back buttons and breadcrumbs must be present when navigating into detail views (profiles, posts, chat rooms).
- Multi-pane patterns (e.g. room list + chat) must use a **list → detail** pattern on mobile: show the list first, then navigate to full-screen detail on tap, with a back button to return.
- Avoid dead-end pages on mobile — every page must have a clear way to navigate away.

### 3) Touch Targets

- All interactive elements (buttons, links, toggles) must have a minimum touch target of **44×44px** (or 48×48px preferred). This includes:
  - `py-2 px-3` on small text buttons — often too small, prefer `py-2.5 px-4` minimum.
  - Icon-only buttons — wrap in a 44px hit area even if the icon is 16-20px.
  - List items used as buttons — ensure the full row is tappable, not just the text.
- Spacing between adjacent touch targets must be at least **8px** to prevent mis-taps.

### 4) Text & Readability

- Body text minimum: **14px** (`text-sm` = 14px is OK, `text-xs` = 12px only for secondary/meta text).
- Avoid truncation that hides critical information on mobile. Use multi-line wrapping for names, titles, and descriptions rather than `truncate` on essential content.
- Labels and headings must not collide with adjacent elements when text wraps.

### 5) Forms & Input

- Input fields must be full-width on mobile (`w-full`), not fixed-width.
- Virtual keyboard must not obscure the active input — scroll the input into view or use `pb-safe` / padding at the bottom.
- Select dropdowns and date pickers must use native mobile controls where possible.
- Multi-step forms should show progress and allow going back.
- Form submission buttons must be easily reachable (not hidden below the fold).

### 6) Scroll & Overflow

- Horizontal scroll is only acceptable for intentional carousels or tab bars with `overflow-x-auto` and `scrollbar-hide`.
- Nested scroll containers (scroll within scroll) must be avoided or clearly bounded with `overscroll-contain`.
- Sticky elements (`sticky top-*`) must not stack and consume excessive vertical space on mobile.
- Long lists should have pull-to-refresh or lazy loading patterns, not unbounded DOM growth.

### 7) Modals & Overlays

- Modals must be full-screen or near-full-screen on mobile (not a centered card with margins).
- Bottom sheets are preferred over centered modals on mobile.
- Dismiss area (tap outside, swipe down, or X button) must be easily reachable.
- Background scroll must be locked when a modal is open.

### 8) Images & Media

- Images must use responsive sizing (`w-full`, `max-w-*`, `aspect-ratio`) — no fixed pixel dimensions that overflow.
- Avatars and thumbnails must scale down gracefully (don't use `w-24 h-24` if it takes half the screen width).

### 9) Performance

- Avoid rendering both mobile and desktop layouts simultaneously (don't render two full DOM trees and hide one with CSS). Use responsive CSS or a single adaptive component.
- Lazy load off-screen content (images, heavy components below the fold).
- Minimize layout shifts caused by async data loading — use skeleton placeholders.

### 10) Capacitor / Native App

- Check if the page is used inside Capacitor (`useIsNative()` hook). If so:
  - Safe area insets must be respected (`env(safe-area-inset-top)`, etc.).
  - No reliance on browser-specific features (URL bar, pull-to-refresh via browser).
  - Navigation must work without browser back/forward buttons.

## Common Patterns in This Codebase

| Pattern | How it should work on mobile |
|---|---|
| Desktop sidebar + content (`hidden lg:block` + flex) | Sidebar hidden, `NetworkMobileNav` pill bar shown above content |
| Split view (list + detail side by side) | Show list full-width; on item tap, show detail full-screen with back button |
| Profile page with tabs | Tabs should scroll horizontally if they overflow |
| Card grids (`grid-cols-3`, `grid-cols-4`) | Collapse to `grid-cols-1` or `grid-cols-2` on mobile |
| Compose page | Full-width form, visibility options stack vertically |
| Data tables | Horizontal scroll with `overflow-x-auto`, or card-based layout on mobile |

## Key Files to Check

- `src/components/MobileTabBar.tsx` — Bottom tab bar for mobile (hidden on `sm:` and up)
- `src/components/AppNav.tsx` — Top nav (hidden on mobile, replaced by MobileTabBar)
- `src/components/SidebarNav.tsx` — Desktop-only sidebar
- `src/components/social/NetworkSidebar.tsx` — Exports `NetworkMobileNav` for mobile
- `src/app/(app)/app-layout-client.tsx` — App shell with mobile detection

## Output Format

Report findings as a checklist:

```
## Mobile Usability Review — [Page/Component Name]

### Viewport: 375px (phone)
- [ ] FAIL: [description of issue, element, and which rule it violates]
- [x] PASS: [area checked and confirmed working]

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
|---|---|---|
| **Critical** | Content unreachable, page broken, navigation dead-end | Must fix before shipping |
| **Warning** | Suboptimal but functional (small touch targets, minor overflow) | Fix in same PR if quick, otherwise follow-up |
| **Info** | Enhancement suggestion | Log for future improvement |
