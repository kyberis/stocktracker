---
name: pm-import
description: Enforces zero-friction portfolio import UX — all import methods on one page, visible how-to guides, and guide-code coupling so explanations stay current. Use when adding, modifying, or reviewing any import flow, broker parser, import UI, or import help text.
---

# Portfolio Import — Product Management

## Mission

Reduce portfolio import friction to the absolute minimum: fewest clicks, zero page navigation, clear upfront guidance. Every user — regardless of broker or technical skill — should complete their first import without confusion.

## When To Apply

Apply this skill when the change involves:
- Adding or modifying any import method (broker CSV, AI, manual, API sync)
- Changing the import UI layout, navigation, or entry points
- Adding a new broker parser under `src/lib/broker-parsers/`
- Modifying import help text, instructions, or onboarding copy
- Reviewing a PR that touches import components or API routes

## Core Principles

### 1. Single-Page Principle

Every import method must be reachable from one unified import page without navigating to a different route or opening a separate modal. The user should never wonder "where is the other way to import?"

Current import entry points that must converge:
- `src/components/ImportPortfolioModal.tsx` (dashboard toolbar)
- `src/components/BrokerImport.tsx` (tools page tab)
- `src/components/AddStockModal.tsx` (manual add)

### 2. Explain-First UX

Each import method shows a concise how-to guide **before** the user uploads or connects. Guides are visible by default — not hidden behind a collapse, tooltip, or "learn more" link. The guide tells the user:
1. Where to find the file in their broker platform (with exact navigation path)
2. What format to select when exporting
3. What to expect after uploading (preview, review, confirm)

### 3. Guide-Code Coupling

Any change to an import flow must update the corresponding on-page explanation **in the same PR**. See the file-pairs mapping in [reference.md](reference.md) for exact pairings.

## Friction Audit Checklist

Every import-related change must pass this checklist:

```md
Import Friction Checklist
- [ ] Total clicks from dashboard to completed import <= 4
- [ ] Pages/modals navigated to reach any import method: 1
- [ ] How-to guide visible without extra interaction (no hidden collapse)
- [ ] New broker instructions included if adding a new parser
- [ ] Guide text updated if import flow changed (guide-code coupling)
- [ ] English and Spanish text provided for all user-facing copy
- [ ] Mobile-friendly (no horizontal scroll, tap targets >= 44px)
- [ ] Preview step shows data before committing the import
- [ ] Error states are clear and suggest a next action
- [ ] Duplicate detection feedback is visible in the preview
```

## Unified Import Page Spec

The import page consolidates all methods into clearly labeled sections:

| Section | Methods | Key UI |
|---------|---------|--------|
| Broker CSV | DEGIRO, IBKR, Trading 212, Revolut, Simple CSV | Broker selector + drag-and-drop zone + inline guide per broker |
| Broker API | IBKR Flex Query | Connection wizard + re-sync button + inline guide |
| AI Import | Screenshot or generic CSV | Drag-and-drop zone + explanation of AI extraction |
| Manual | Single holding, single transaction | Inline forms (no separate modal) |
| Template | Simple CSV template download | One-click download link |

Each section includes:
- A short **how-to** block (2-4 sentences + numbered steps from the broker's platform)
- A **drag-and-drop** or **form** area immediately below the guide
- A **preview** step before any data is committed

## Adding a New Broker

When adding a new broker parser:

1. Create the parser in `src/lib/broker-parsers/<broker-name>.ts`.
2. Register it in `src/lib/broker-parsers/index.ts`.
3. Add it to the import page's broker selector with a label and description.
4. Write the how-to guide for that broker (exact nav path in the broker's platform, export format, expected file name).
5. Provide both English and Spanish versions of the guide text.
6. Update `reference.md` file-pairs mapping with the new entries.

## Design Review

Import UI changes require a mockup (delegate to `product-manager` skill's mockup workflow) that demonstrates:
- All methods visible on one page
- How-to guides displayed by default
- Mobile layout with stacked sections
- Preview step for the changed method

## Coordination

- **`engineer-integrations`** — broker parser implementation and API route changes
- **`engineer-data`** — data model, duplicate handling, and persistence
- **`product-manager`** — mockup generation and design approval
- **`legal-advisor`** — if the change collects new user data or adds a third-party service
- **`release-notes` rule** — every user-facing import change needs a release note
- **`landing-page` rule** — evaluate whether a new import method warrants a landing page update

## Extra Resources

- File-pairs mapping and per-broker guide templates: [reference.md](reference.md)
- Product context and segments: `product-manager` skill's `reference.md`
- Feature history: `src/lib/release-notes.ts`
