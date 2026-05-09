---
name: accessibility-reviewer
description: Reviews UI and UX changes for WCAG 2.1 AA accessibility compliance — keyboard navigation, screen reader support, color contrast, focus management, ARIA attributes, and semantic HTML. Use when any component, page, modal, form, chart, or interactive element is added or modified.
---

# Accessibility Reviewer

## Mission

Ensure every user-facing change meets WCAG 2.1 AA standards and is usable by people with visual, motor, auditory, and cognitive disabilities.

## When To Apply

Apply this skill whenever a change touches:

- New or modified components, pages, modals, drawers, or dialogs
- Forms, inputs, selects, buttons, or interactive controls
- Charts, data visualizations, or tables
- Navigation, routing, or focus-trapping elements
- Color, contrast, or theme changes
- Animations or motion
- Toasts, alerts, or status messages
- Drag-and-drop or gesture-based interactions
- Mobile-responsive layout changes

## Review Workflow

Run through each section that applies to the change. Report findings using the output format at the bottom.

### 1) Semantic HTML

- Use native HTML elements over custom `<div>` / `<span>` wherever possible (`<button>`, `<nav>`, `<main>`, `<section>`, `<dialog>`, `<table>`, `<ul>`).
- Headings (`<h1>`–`<h6>`) must follow a logical hierarchy — no skipped levels.
- Lists of items must use `<ul>` / `<ol>`, not styled divs.
- Landmark regions (`<header>`, `<main>`, `<footer>`, `<aside>`, `<nav>`) should be present and not duplicated without labels.

### 2) Keyboard Navigation

- Every interactive element must be reachable and operable with keyboard alone (Tab, Shift+Tab, Enter, Space, Escape, Arrow keys).
- Focus order must follow a logical reading sequence — no focus traps outside of modals.
- Modals must trap focus while open and return focus to the trigger element on close.
- Dropdown menus and selects must support arrow-key navigation.
- Skip-to-content link should exist for page-level navigation.
- Custom components acting as buttons must use `<button>` or have `role="button"` with `tabIndex={0}` and `onKeyDown` handlers for Enter/Space.

### 3) Focus Indicators

- All focusable elements must have a visible focus ring — never use `outline-none` without a replacement.
- Focus styles must have sufficient contrast (3:1 against adjacent colors per WCAG 2.4.7).
- Use a consistent `focus-visible:` ring pattern aligned with your design tokens.

### 4) Color & Contrast

- Text must meet minimum contrast ratios: 4.5:1 for normal text, 3:1 for large text (≥18px bold or ≥24px).
- Verify both light and dark themes — check `dark:` variant pairings against your design system.
- Information must not be conveyed by color alone — use icons, text labels, or patterns alongside color (e.g., gain/loss should show an arrow or +/- sign, not just green/red).
- UI components and graphical objects must have 3:1 contrast against adjacent colors.

### 5) Images & Icons

- Informative images must have descriptive `alt` text.
- Decorative images must have `alt=""` or use `aria-hidden="true"`.
- Icon-only buttons must have `aria-label` or visually hidden text.
- SVG icons used inline should have `role="img"` and `aria-label`, or `aria-hidden="true"` if decorative.

### 6) Forms & Inputs

- Every input must have an associated `<label>` (via `htmlFor` or wrapping) — placeholder text is not a substitute.
- Required fields must be indicated programmatically (`required` or `aria-required="true"`) and visually.
- Error messages must be associated with the input via `aria-describedby` and announced to screen readers.
- Form validation errors should use `aria-invalid="true"` on the field.
- Group related controls with `<fieldset>` and `<legend>` where applicable.

### 7) Dynamic Content & Live Regions

- Content that updates without page reload (toasts, alerts, live data, loading states) must use ARIA live regions:
  - `role="alert"` or `aria-live="assertive"` for critical errors.
  - `aria-live="polite"` for non-urgent status updates.
- Loading indicators must announce state to screen readers (`aria-busy="true"`, status text).
- Route changes in SPA frameworks should announce the new page title to assistive tech.

### 8) Charts & Data Visualizations

- Charts must have a text alternative: a nearby summary, data table, or `aria-label` describing the trend.
- Interactive chart elements should be keyboard-accessible where feasible.
- Tooltips on charts must not rely solely on hover — consider focus-triggered tooltips.
- Color-blind safe palettes should be used; distinguish series with patterns or labels, not just hue.

### 9) Motion & Animation

- Respect `prefers-reduced-motion` — wrap animations in `@media (prefers-reduced-motion: no-preference)` or use Tailwind's `motion-safe:` / `motion-reduce:` utilities.
- No content should flash more than 3 times per second.
- Auto-playing carousels or tickers must have pause controls.

### 10) Responsive & Touch Targets

- Touch targets must be at least 44×44px (WCAG 2.5.5 AAA recommended, 24×24px AA minimum).
- Ensure content is usable at 200% zoom without horizontal scroll.
- Do not disable pinch-to-zoom (`user-scalable=no`).

## Severity Levels

Rate each finding:

- **Critical**: Blocks access entirely for some users (missing labels, keyboard traps, zero-contrast text). Must fix before shipping.
- **Major**: Significantly degrades experience (poor contrast, missing live regions, no focus indicators). Should fix before shipping.
- **Minor**: Suboptimal but usable (verbose alt text, missing `prefers-reduced-motion`, touch target slightly under 44px). Fix when practical.

## Output Format

```md
## Accessibility Review

### Summary
- Findings: [X critical, Y major, Z minor]
- Overall: [Pass / Pass with recommendations / Fail — must fix critical issues]

### Critical
1. [Component/element] — [Issue description] — [Fix: specific remediation]

### Major
1. [Component/element] — [Issue description] — [Fix: specific remediation]

### Minor
1. [Component/element] — [Issue description] — [Fix: specific remediation]

### Passes
- [List of accessibility areas that are well-handled]
```

## Coordination

- Align chart and table accessibility with your design system and data teams.
- Add automated or manual regression tests for critical flows when your project uses **qa-tester** or equivalent.
- For regulated industries, verify accessibility obligations with your legal or compliance stakeholders.
