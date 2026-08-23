# feedback

> In-app feedback widget.

## 1. Summary
Floating feedback button that captures issues/ideas, optionally with AI-drafted ack emails.

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-user-auth`](../../.cursor/skills/engineer-user-auth/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/feedback/`](../../src/app/api/feedback) | Submit. |
| Admin | [`src/app/api/admin/feedback/`](../../src/app/api/admin/feedback) | Triage. |

## 4. Data model
- `feedback`: subject, body, category, user_id.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/feedback` | user | Free | Submit. |

## 6. UI surface
- Floating button + drawer form.

## 7. Business logic
- Rate-limited; AI-drafted ack with human-in-loop reply.

## 8. External dependencies
- Resend (ack email).

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Rate-limited.

## 12. Telemetry
- `feedback_submitted_total`.

## 13. Edge cases & gotchas
- Do not include PII in automated acks.

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`automated-user-comms`](../../.cursor/skills/automated-user-comms/SKILL.md)
- Related specs: [support-chat](support-chat.md).

## 16. Open questions / planned work
- Clustered themes dashboard.
