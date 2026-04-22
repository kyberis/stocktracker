# net-worth-tracking

> Net-worth view combining portfolios, cash, and manual assets.

## 1. Summary
Dashboard-style page summing all portfolios + cash + manual assets, with a trend chart. Pro feature.

## 2. Status
- **Tier:** Bifolio+
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/tools/net-worth/`](../../src/app/(app)/tools/net-worth) | Page. |
| API | [`src/app/api/net-worth/`](../../src/app/api/net-worth) | Aggregation. |

## 4. Data model
- Reads all user tables; writes nothing.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/net-worth` | user | Pro | Aggregate snapshot. |

## 6. UI surface
- Totals + per-category breakdown + time series.

## 7. Business logic
- Inclusion toggles per manual asset.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- Per-asset currency → EUR → preferred-currency display.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('net-worth')`.

## 12. Telemetry
- `analytics_events`: `net_worth.viewed`.

## 13. Edge cases & gotchas
- Manual-asset revaluations create chart steps; label them.

## 14. Tests
- Integration.

## 15. Related skills and rules
- [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)
- Related specs: [manual-assets](manual-assets.md).

## 16. Open questions / planned work
- Liability tracking (mortgages, loans).
