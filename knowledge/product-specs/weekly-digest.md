# weekly-digest

> Personalized weekly portfolio email.

## 1. Summary
Every Sunday (or Monday AM) users receive a digest with weekly P/L, big movers, dividends, AI review snippet, and upcoming events.

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Cron | [`src/app/api/cron/weekly-digest/`](../../src/app/api/cron/weekly-digest) | Sends batch. |
| Library | [`src/lib/digest-generation.ts`](../../src/lib/digest-generation.ts) | Compose. |

## 4. Data model
- Reads portfolio, snapshots, events.
- Writes to `email_send_log`.

## 5. API surface
- Cron only.

## 6. UI surface
- Preview page for admin QA.

## 7. Business logic
- Batched per ~1000 users to throttle Resend.
- Empty-portfolio variant skips P/L section, includes tutorial.

## 8. External dependencies
- Resend, OpenAI (AI snippet).

## 9. Currency / FX / tax implications
- All figures in preferred currency.

## 10. i18n
- Locale-per-user template.

## 11. Permissions / tier gating / rate limits
- Respects user's digest opt-out.

## 12. Telemetry
- `digest_sent_total`, `digest_errors_total`.

## 13. Edge cases & gotchas
- Users without activity for 14 days → deprioritize AI snippet.

## 14. Tests
- Fixture-based digest composition tests.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [daily-market-digest](daily-market-digest.md), [portfolio-review](portfolio-review.md).

## 16. Open questions / planned work
- Personal best/worst trade explanation.
