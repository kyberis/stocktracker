---
name: automated-user-comms
description: >-
  Rules for LLM-generated or server-composed messages sent to end users without a human in the loop at send time — transactional and automated emails, cron notifications, AI-drafted acknowledgements, and dynamic templates. Use when implementing or reviewing any code path that produces user-facing outbound text via LLM or templates filled by automation (including feedback pipeline, digests, and admin-approved drafts). Complements ux-writer for voice; adds safety, honesty, and locale expectations.
---

# Automated user communications (LLM / server)

## When to apply

- Any feature that uses an LLM or deterministic templates to **compose text that is emailed or shown to users** as part of an automated workflow.
- Reviewing PRs that add `openai`, prompt strings, or email HTML built from model output.

## Relationship to other skills

- **ux-writer**: brand voice, persona tiers, EN/ES minimums, patterns by surface. **Apply ux-writer first** for tone; then apply this skill for automation-specific rules.
- **legal-advisor**: if the message references personal data, financial product behavior, or third-party services — ensure compliance before shipping.

## Core rules

1. **No false precision** — Do not promise ship dates, SLA, or investment outcomes unless explicitly provided in trusted input (e.g. admin field). Prefer "we'll take this into account" over "we will implement this by …".
2. **No personalized financial advice** — Remind that the product is informational; no recommendations tailored to the user's situation unless the product explicitly supports that flow and legal has signed off.
3. **Language** — Match `EmailLocale` / user preference when available. Otherwise default English; Spanish when the app locale is Spanish-only for that user. Keep terminology consistent with `src/locales`.
4. **Transparency** — Where helpful, state *why* the user is receiving the message (e.g. "You submitted feedback on …").
5. **Brevity** — Short paragraphs; one primary ask or takeaway; subject line &lt; 60 characters; preheader 40–90 characters when used.
6. **PII** — Do not echo unnecessary personal data in the body; minimize duplication of emails, IDs, or portfolio details in automated text.
7. **Assumptions** — If the model must infer missing context, output a short `assumptions[]` list for human review in admin-only flows; never invent ticket IDs or user actions.

## Output shape (for prompts / agents)

When generating content, produce:

- `subject` (string)
- `preheader` (optional string)
- `html` or `text` (string)
- `assumptions` (optional string[]) — for pipelines with human review before send

## Checklist before merge

- [ ] Voice matches **ux-writer** for the target locale/persona.
- [ ] No prohibited promises or advice (see above).
- [ ] Unsubscribe / legal footer preserved for marketing-style sends; transactional sends follow `sendEmail` conventions in `src/lib/email.ts`.

## References in this repo

- Feedback auto-ack and completion: `src/lib/email.ts` (`sendFeedbackAutoAckEmail`, `sendFeedbackCompletionEmail`).
- Cron: `src/app/api/cron/feedback-pipeline/route.ts`.
