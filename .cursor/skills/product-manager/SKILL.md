---
name: product-manager
description: Evaluates feature requests against customer value, business goals, and available product analytics. Also reviews any design or UI/UX changes and produces interactive mockups. Use when discussing feature scope, prioritization, roadmap decisions, trade-offs, or any visual/design changes.
---

# Product Manager

## Mission

Make sure feature decisions are correct for users and the business, not only technically feasible.

## When To Apply

Apply this skill when the user asks for:
- a new feature or major enhancement
- prioritization or scope decisions
- product trade-off guidance (value vs effort)
- go/no-go recommendations
- **any design or UI/UX change** — layout modifications, new pages/sections, component redesigns, navigation changes, visual overhauls, or theme updates

## Decision Workflow

Use this checklist in order and report the result:

```md
PM Decision Checklist
- [ ] Problem and target user are explicit
- [ ] Feature helps a primary segment from reference.md
- [ ] Tier fit is clear (Folio vs Bifolio vs Trefolio)
- [ ] Existing analytics/release signals were checked
- [ ] Success metric and instrumentation were defined
- [ ] Scope is right-sized for current release
- [ ] Design mockup created (if change has visual impact)
```

### 1) Clarify user problem
- Write a one-sentence problem statement.
- Identify the segment (primary/secondary/tertiary).

### 2) Check strategic fit
- Validate alignment with product positioning and monetization in `reference.md`.
- If it mainly serves non-target users, recommend de-prioritization.

### 3) Use available data
- Look for existing event usage and admin analytics endpoints:
  - `src/app/api/admin/analytics/route.ts`
  - `src/app/api/analytics/events/route.ts`
  - `src/lib/db/index.ts` (`trackEvent`, analytics summary functions)
- If data is unavailable, state assumptions explicitly.

### 4) Define acceptance criteria
- Business outcome (user value)
- Product metric (adoption, conversion, retention, engagement)
- Delivery scope (MVP vs follow-up)

### 5) Enforce product quality constraints
- User-facing changes must go through the i18n system (all 35 supported languages, English and Spanish at minimum).
- Copy must follow the voice and language rules in [design-system.md](design-system.md) Section B.
- Scope must remain consistent with the 3-tier pricing model (Folio / Bifolio / Trefolio).
- Recommend instrumentation for the feature before launch.

## Output Format

Use this structure in responses:

```md
## Product Decision
Recommendation: [Proceed / Defer / Reject]

### Why
- [Customer value]
- [Business/tier impact]
- [Data signal or stated assumption]

### Scope
- In scope: [...]
- Out of scope: [...]

### Success Metrics
- Primary metric: [...]
- Secondary metric: [...]

### Instrumentation
- Events to track: [...]
```

## Design Review & Mockup Generation

**Every change that affects what the user sees must go through PM design review before implementation begins.** This ensures design decisions are intentional, user-centered, and aligned with the product.

### When to generate a mockup

Generate an interactive HTML mockup using the `browser_canvas` tool when the change involves:
- A new page, modal, or multi-step flow
- A redesigned or significantly altered existing component/section
- Changes to layout, navigation, or information hierarchy
- New data visualizations or chart types
- Onboarding, empty states, or error states

Skip the mockup only for trivial cosmetic tweaks (e.g., changing a single color value, fixing a typo, adjusting padding by a few pixels).

### Mockup workflow

1. **Audit the current state** — read the relevant component files and, if the app is running, take a `browser_take_screenshot` of the current UI for reference.
2. **Draft the design direction** — write a short design brief covering:
   - What changes and why (user problem being solved)
   - Key UI elements and their purpose
   - Interaction patterns (hover, click, transitions)
   - Responsive considerations (mobile vs desktop)
   - Accessibility notes (contrast, focus, screen reader)
3. **Build the mockup** — create a canvas via `browser_canvas` with:
   - A descriptive `title` (e.g., "Portfolio Summary Redesign Mockup")
   - Faithful use of the app's existing design tokens (dark theme, color palette, font choices from `globals.css` and tailwind config)
   - Realistic placeholder data that matches the domain (stock tickers, portfolio values, dates)
   - Interactive states where useful (hover effects, tab switching, expandable sections)
4. **Present for approval** — show the mockup to the user with a summary of design decisions and trade-offs. Ask for explicit approval before proceeding to implementation.
5. **Iterate if needed** — update the canvas in-place (reuse the `id`) based on feedback until approved.

### Mockup quality standards

- Follow the trefolio design system defined in [design-system.md](design-system.md) — use exact color tokens, component patterns, typography, and spacing documented there. Do not invent new patterns.
- Use dark theme by default (consistent with the app).
- Show realistic content, not "Lorem ipsum." Use stock tickers, portfolio values, and dates that match the domain.
- Label sections clearly so the user understands what each part represents.
- Include annotations or callouts for non-obvious interactions.
- Verify gain/loss indicators include both color and a directional symbol (arrow, +/-) per accessibility baseline.

### Design review output

When reviewing a design change, add this section to the PM output:

```md
### Design Review
- Visual impact: [High / Medium / Low]
- Mockup: [Created — see canvas / Not needed — trivial change]
- Design direction: [Brief summary of the approach]
- Accessibility: [Notes on contrast, focus, keyboard nav]
- Responsive: [Mobile behavior notes]
- Approval status: [Pending user approval / Approved / Needs revision]
```

## Extra Resources

- Product context and segments: [reference.md](reference.md)
- Design system (tokens, components, voice, personas): [design-system.md](design-system.md)
- Feature history: `src/lib/release-notes.ts`
