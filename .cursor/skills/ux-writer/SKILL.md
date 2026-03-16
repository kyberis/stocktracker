---
name: ux-writer
description: Enforces consistent voice, tone, and copy across all user-facing text in trefolio — emails, onboarding, tooltips, notifications, error messages, CTAs, and marketing copy. Adapts language complexity based on the user's investment experience level (beginner, intermediate, experienced, professional). Use when writing, reviewing, or editing any user-facing text, email templates, onboarding steps, empty states, error messages, or notification copy.
---

# UX Writer

## Mission

Maintain a consistent brand voice across every surface of trefolio. The voice is **serious but friendly** — users trust us with their financial data, so we sound competent and clear, never patronizing or robotic.

## Persona Tiers

User experience level is stored in `users.experience_level`. Adapt language complexity accordingly.

| Tier | DB value | Audience | Tone |
|------|----------|----------|------|
| Beginner | `beginner` | New to investing | Casual, explanatory. Avoid jargon. Use analogies when helpful. Spell out acronyms on first use. |
| Intermediate | `intermediate` | 1-3 years experience | Balanced. Use common financial terms (P/E, dividend yield) with brief parenthetical context when introducing less common ones. |
| Experienced | `experienced` | 3+ years experience | Concise. Standard financial terminology without explanation. Assume familiarity with portfolio theory, metrics, and market mechanics. |
| Professional | `professional` | Finance professionals | Precise and data-dense. Assume deep domain knowledge. Use industry shorthand freely (TTWROR, XIRR, DPS, NAV). |

When experience level is unknown or empty, default to **Intermediate** tone.

## Voice Principles

1. **Clarity over cleverness** — plain language wins. No puns, wordplay, or forced humor.
2. **Active voice** — "Your portfolio gained 3.2%" not "A gain of 3.2% was observed."
3. **Second person** — address the user as "you" / "your."
4. **Present tense** — "Your alert triggers when..." not "Your alert will trigger when..."
5. **Concise** — every word earns its place. Cut filler ("just", "simply", "please note that").
6. **Honest** — never overstate. "Track your portfolio" not "Maximize your returns."
7. **Inclusive** — avoid gendered language, cultural assumptions, or idioms that don't translate.

## Language and i18n

- All user-facing copy must exist in English (`en`) and Spanish (`es`) at minimum.
- Email copy uses the `EmailLocale` type (`"en" | "es"`).
- UI copy uses the full `Language` type (35 locales) via `src/locales/`.
- Translation keys go in `src/locales/en.ts` and `src/locales/es.ts`; other locales use English fallback until translated.
- Never hard-code user-facing strings; always use `t()` from `useI18n()`.

## Copy Patterns by Surface

### Emails

- **Subject lines:** < 60 chars, front-load the key info, no ALL CAPS.
- **Preheader:** 40-90 chars, complements (not repeats) the subject.
- **Body:** Short paragraphs (2-3 sentences max). One clear CTA per email.
- **CTA buttons:** Action verb + object ("View your portfolio", "Confirm your email").
- **Footer:** Always include unsubscribe link and company info.
- Adapt body complexity to persona tier.

### Onboarding

- Short, encouraging. One concept per step.
- Beginner: "Let's set up your first portfolio — it only takes a minute."
- Professional: "Configure your default currency and tax residency."

### Error Messages

- State what happened, why, and what to do next.
- Never blame the user. Never show raw error codes.
- Beginner: "We couldn't load your portfolio right now. This usually fixes itself — try refreshing the page."
- Professional: "Portfolio sync failed (timeout). Retry or check connection status."

### Empty States

- Explain what belongs here and how to get started.
- Include a CTA to the relevant action.

### Tooltips and Help Text

- One sentence max. Link to docs for detail.
- Beginner: include a brief definition.
- Experienced/Professional: reference only, no definition.

### Notifications

- Title: < 50 chars, noun-first ("Price alert: AAPL above $200").
- Body: 1-2 sentences with actionable context.

## Financial Disclaimer Rules

- Never use language that implies financial advice: "should buy", "recommended", "guaranteed."
- Acceptable: "track", "monitor", "analyze", "review."
- Any page displaying financial data or AI analysis must preserve existing disclaimer text.

## Quality Checklist

- [ ] Copy matches the appropriate persona tier
- [ ] EN and ES versions provided (emails) or translation keys added (UI)
- [ ] No jargon without context for beginner/intermediate tiers
- [ ] CTAs use action verb + object pattern
- [ ] Error messages include a recovery action
- [ ] No financial advice language
- [ ] Subject lines < 60 chars (emails)
- [ ] Consistent terminology with existing copy (check `src/locales/en.ts`)

## Coordination

- If writing email templates, also follow patterns in `src/lib/email.ts` (shared helpers: `emailHeader`, `emailFooter`, `primaryCta`, `featureRow`).
- If adding UI strings, add keys to `src/locales/en.ts` and `src/locales/es.ts`.
- If the copy appears on the landing page, coordinate with the `sales` skill.
- If the copy involves financial data display, coordinate with `financial-calculations` skill.
- For detailed copy examples per persona tier, see [reference.md](reference.md).
