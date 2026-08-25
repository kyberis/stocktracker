# admin-engagement-report

> Admin HTML engagement report with AI narrative and confirm-to-send survey campaigns.

## 1. Summary

Staff generate an on-demand HTML report of access/engagement, tool usage, CSAT, and feedback, plus an AI narrative and survey proposals. From the same tool, admins confirm and email template surveys (`winback`, `missing_tool`, `nps`) with AI-drafted questions localized to each user.

## 2. Status

- **Tier:** Admin
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/analytics-instrumentation/SKILL.md`](../../.cursor/skills/analytics-instrumentation/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/admin/engagement-report/page.tsx`](../../src/app/(app)/admin/engagement-report/page.tsx) | Admin UI |
| API | [`src/app/api/admin/engagement-report/route.ts`](../../src/app/api/admin/engagement-report/route.ts) | Generate / list / load |
| API | [`src/app/api/admin/survey-campaigns/`](../../src/app/api/admin/survey-campaigns) | Create / confirm / send |
| API | [`src/app/api/survey/[token]/route.ts`](../../src/app/api/survey/[token]/route.ts) | Public token load/submit |
| Page | [`src/app/survey/[token]/page.tsx`](../../src/app/survey/[token]/page.tsx) | User survey form |

## 4. Data model

- `engagement_reports` — snapshot JSON, HTML, narrative, survey proposals
- `survey_campaigns` — template, status, EN/ES question drafts
- `survey_invites` — per-user token, language, questions, email status
- `survey_responses` — answers JSON, optional NPS score

Schema: migration v150 in [`src/lib/db/migrations.ts`](../../src/lib/db/migrations.ts).

## 5. API surface

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/admin/engagement-report` | admin | List or load by `?id=` |
| POST | `/api/admin/engagement-report` | admin | Build snapshot + AI narrative + store HTML |
| GET/POST | `/api/admin/survey-campaigns` | admin | List / create draft campaign |
| GET/POST | `/api/admin/survey-campaigns/[id]` | admin | Detail; `action=confirm\|send\|cancel` (`send` requires `confirmed:true`) |
| GET/POST | `/api/survey/[token]` | public (token) | Load questions / submit answers |

## 6. UI surface

- Admin tab: Engagement Report (System nav)
- User: `/survey/[token]` (middleware-public)

## 7. Business logic

- Segments: engaged ≤7d, warm 8–30d, dormant 31–90d, churned >90d, never_active
- Survey templates are fixed; AI adapts wording only
- Emails use Resend via `sendEngagementSurveyEmail`, honor unsubscribe / email_notifications_enabled
- Cascade delete on user removal for invites/responses

## 8. External dependencies

- Vercel AI Gateway / OpenAI (narrative + question drafts)
- Resend (survey invite emails)

## 9. Currency / FX / tax implications

- N/A

## 10. i18n

- Report narrative: English (admin)
- Survey questions: EN + ES drafts; invite uses `user_settings.language`

## 11. Permissions / tier gating / rate limits

- Admin-only generation and send
- Public survey access via opaque token

## 12. Telemetry

- AI calls logged to `ai_logs` with source `engagement_report`

## 13. Edge cases & gotchas

- AI failure falls back to deterministic narrative/proposals
- Send skips users without email or with notifications disabled
- Double-submit returns 409

## 14. Tests

- Unit: segments, tool taxonomy, AI Zod parse, HTML smoke
- API: public token submit guards (covered in unit helpers)

## 15. Related skills and rules

- [`analytics-instrumentation`](../../.cursor/skills/analytics-instrumentation/SKILL.md)
- [`automated-user-comms`](../../.cursor/skills/automated-user-comms/SKILL.md)
- [`legal-advisor`](../../.cursor/skills/legal-advisor/SKILL.md)
- Related: [admin-analytics](admin-analytics.md), [feedback](feedback.md)

## 16. Open questions / planned work

- In-app notification channel for surveys
- Scheduled weekly auto-reports
