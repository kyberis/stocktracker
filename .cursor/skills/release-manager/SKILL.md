---
name: release-manager
description: Curates release contents and assigns version numbers for StockTracker releases. Decides which changes are user-noteworthy and which are omitted. Use when cutting a release, bumping versions, writing release notes, or deciding what ships in a version.
---

# Release Manager

## Mission

Ship coherent, user-meaningful releases. Filter noise — not every code change deserves a release note. Coordinate with the Product Manager skill to align releases with product goals.

## When To Apply

- Cutting a new release or deciding version bump
- Writing or reviewing release note entries
- Grouping multiple changes into a single release
- Deciding whether a change is user-noteworthy

## Versioning Scheme

The project uses `0.MAJOR.PATCH` (pre-1.0 semver):

| Bump | When | Example |
|------|------|---------|
| **MAJOR** (`0.X.0`) | New user-facing feature or capability | 0.23.0 → 0.24.0 |
| **PATCH** (`0.X.Y`) | Improvements, fixes, or follow-ups to a MAJOR | 0.24.0 → 0.24.1 |

Rules:
- A release with at least one `type: "feature"` change gets a MAJOR bump.
- A release with only `improvement` or `fix` entries gets a PATCH bump.
- Multiple small patches can ship under the same MAJOR if no new feature landed.
- Never skip numbers; increment sequentially.

## What Goes In Release Notes

### Include

- New capabilities users can see or interact with
- Meaningful UX improvements (layout overhauls, new views, workflow changes)
- Fixes to bugs that users could have encountered
- Changes to pricing, tier entitlements, or limits
- New integrations or data sources

### Exclude (do NOT add entries for)

- Internal refactors with no visible behavior change
- Dev tooling changes (linter config, CI tweaks, test additions)
- Code cleanup, renaming, or restructuring
- Dependency bumps unless they fix a user-facing issue
- Intermediate WIP commits that get superseded within the same release
- Performance tweaks unless the improvement is noticeable to users
- Admin-only or developer-only changes that don't affect customers (unless they're significant features like a new admin panel section)

### Gray Area — Use Judgment

- Observability/metrics additions: include only if they add a user-visible dashboard or status page
- Security hardening: include if it changes user behavior (e.g., new verification flow); omit if invisible
- Error message improvements: include only if the old messages caused support issues

## Release Note Quality

Each entry must be:

1. **Benefit-oriented** — describe what the user gains, not what the code does
2. **Bilingual** — include both `text` (English) and `textEs` (Spanish)
3. **Concise** — one sentence, front-loaded with the outcome
4. **Correctly typed** — `feature` for new capabilities, `improvement` for enhancements, `fix` for bug corrections

Bad: "Refactored portfolio context to use useMemo"
Good: "Faster dashboard loading by reducing unnecessary re-renders"

Bad: "Added Cache-Control headers to API routes"
Good: "Search and exchange-rate data now loads faster with smarter caching"

## Release Title

Each version needs a short title (and Spanish translation) that captures the theme:
- Group related changes under one narrative when possible
- Prefer "X & Y" over listing every change
- Keep under 60 characters

## Workflow

### 1) Inventory changes

Review `git diff` or `git log` since the last release tag. List all changes.

### 2) Filter

Apply the include/exclude criteria above. Discard internal-only changes.

### 3) Consult PM (when applicable)

If the release includes a new feature or significant scope, invoke the Product Manager skill to validate:
- Does it align with current product priorities?
- Is the tier assignment (Free vs Pro) correct?
- Should it be highlighted as a headline feature or listed as a secondary item?

### 4) Assign version

- Any `feature` entry → bump MAJOR
- Only `improvement`/`fix` → bump PATCH

### 5) Write entries

Update `src/lib/release-notes.ts`:
- Bump `CURRENT_VERSION`
- Add a new `ReleaseEntry` at the top of the `releaseNotes` array
- Include `version`, `date` (YYYY-MM-DD), `title`, `titleEs`, and `changes`

### 6) Evaluate landing page impact

Per workspace rules, if the release contains a `type: "feature"` entry, evaluate whether it should appear on the landing page at `src/app/landing/page.tsx`.

## Output Format

When recommending a release, present:

```md
## Release Plan: 0.X.Y — "Title"

### Included
- [feature] Description
- [improvement] Description

### Excluded (internal only)
- Reason: description of omitted change

### Version Rationale
Why MAJOR vs PATCH was chosen.
```

## Coordination

- **Product Manager**: validates feature scope and tier fit before release
- **QA Tester**: confirms test coverage before tagging
- **Landing Page rule**: triggers screenshot and feature card updates for new features
- **Release Notes rule**: enforces the mechanical entry in `release-notes.ts`
