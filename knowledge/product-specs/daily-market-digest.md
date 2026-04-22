# daily-market-digest

> Daily AI-generated market commentary (optional).

## 1. Summary
Opt-in daily digest with brief market recap (indices, currencies, one headline), sent before the European open.

## 2. Status
- **Tier:** Bifolio+
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Cron | [`src/app/api/cron/daily-market-digest/`](../../src/app/api/cron/daily-market-digest) | Daily sender. |

## 4. Data model
- Reads indices, FX; uses AI to summarize.

## 5. API surface
- Cron only.

## 6. UI surface
- Admin preview.

## 7. Business logic
- Stored daily text once per locale to avoid per-user AI calls.

## 8. External dependencies
- Quote, OpenAI, Resend.

## 9. Currency / FX / tax implications
- Indices shown in native currency.

## 10. i18n
- Localized.

## 11. Permissions / tier gating / rate limits
- Pro-gated opt-in.

## 12. Telemetry
- `market_digest_sent_total`.

## 13. Edge cases & gotchas
- Weekend/holiday skip based on exchange calendar.

## 14. Tests
- Snapshot on composer.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [weekly-digest](weekly-digest.md).

## 16. Open questions / planned work
- Replace AI summary with editorial once volume grows.
