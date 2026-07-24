# Studio Hub

> Public marketing page at `/studio` that presents the full trefolio AI agent studio.

## 1. Summary

Unauthenticated visitors (investors, press, BD partners) open `/studio` to see all five agents — Warren, Clara, Will, Renata, and Roxana — plus a plain-language section on the shared platform. The conversion-optimized homepage funnel at `/landing` is left untouched; `/studio` has its own meta tags and OG image.

This is **not** the authenticated Pro product at `/office` (see [agent-office](agent-office.md)).

## 2. Status

- **Tier:** Public (no auth)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/seo-specialist/SKILL.md`](../../.cursor/skills/seo-specialist/SKILL.md) + marketing

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/studio/page.tsx` | English-only marketing page |
| Layout | `src/app/studio/layout.tsx` | Metadata + JSON-LD |
| Data | `src/app/studio/agents.ts` | Hardcoded agent + platform copy |
| Component | `src/components/agents/AgentCard.tsx` | Shared with landing AgentsTeamSection |
| Nav | Landing `NavBar` + `PublicFooter` | "Studio" / "AI Studio" links |

## 4. Data model

None — static marketing content, no database.

## 5. API surface

None.

## 6. UI surface

- Hero, five-agent grid (Roxana as case-study card without CTA), platform section, closing signup CTA.
- Uses `PublicNav` / `PublicFooter` (same pattern as `/about`).
- Landing `#agents-team` links to `/studio` via `landingAgentsSeeAllStudio`.

## 7. Business logic

- Agent list and platform bullets live in `src/app/studio/agents.ts`.
- Roxana has no public product URL; card shows `caseStudy: "Running live inside PL Packaging"`.

## 8. External dependencies

- Product links: `clara.trefolio.com`, `will.trefolio.com`, `renata.trefolio.com`.
- Avatars: `public/avatars/{warren,clara,will,renata,roxana}-512.png`.
- OG image: `public/screenshots/studio-og.png`.

## 9. Currency / FX / tax implications

None.

## 10. i18n

- Page copy is English-only (hardcoded), matching `/about` / `/leaf`.
- Landing nav key `landingNavStudio` and `landingAgentsSeeAllStudio` in `src/locales/en.ts` (plus overrides in es/fr/de/pt/nl for the nav label).

## 11. Permissions / tier gating / rate limits

- Public route: `/studio` in `PUBLIC_ROUTES` ([`src/middleware.ts`](../../src/middleware.ts)).
- Indexed: `/studio` in [`src/app/robots.ts`](../../src/app/robots.ts) and [`src/app/sitemap.ts`](../../src/app/sitemap.ts).

## 12. Telemetry

- Landing CTA: `landing_cta_click` with `cta: "agents_team_studio"` when users leave AgentsTeamSection for `/studio`.

## 13. Edge cases & gotchas

- Do not confuse with dashboard layout theme `"studio"` or Pro `/office`.
- Naming PL Packaging as a live customer requires their consent for public use.
- WhatsApp is phrased as available via Roxana, not as a platform-wide channel for every agent.

## 14. Tests

- Locale parity still passes (new keys only required on `en.ts`; others spread `...en`).
- Manual: `/studio` reachable logged out; homepage nav + footer link work; `/landing` agent cards unchanged visually.

## 15. Related skills and rules

- Rules: `.cursor/rules/landing-page.mdc`, `.cursor/rules/release-notes.mdc`, `.cursor/rules/legal-compliance.mdc`
- Related specs: [agent-office](agent-office.md), [landing](landing.md), [seo-metadata](seo-metadata.md)

## 16. Open questions / planned work

- Optional future A/B: move homepage AgentsTeamSection higher.
- Confirm ongoing consent to name PL Packaging on the Roxana case-study card.
