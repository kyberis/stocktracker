# broker-integration-requests

> Users vote for brokers they want supported.

## 1. Summary
A simple form lets users request a new broker integration and upvote existing ones. Admins triage via admin panel.

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/broker-integration-requests/`](../../src/app/api/broker-integration-requests) | Create/list/vote. |
| Admin | [`src/app/api/admin/broker-integration-requests/`](../../src/app/api/admin/broker-integration-requests) | Triage. |

## 4. Data model
- `broker_integration_requests`: broker name, requester, votes, status.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/broker-integration-requests` | user | Free | List. |
| POST | `/api/broker-integration-requests` | user | Free | Create. |
| POST | `/api/broker-integration-requests/vote` | user | Free | Upvote. |

## 6. UI surface
- In-app page with leaderboard and filters.

## 7. Business logic
- One vote per user per broker.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Rate-limited to prevent spam.

## 12. Telemetry
- `broker_request_votes_total`.

## 13. Edge cases & gotchas
- Duplicate broker name consolidation (alias map).

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [import-hub](import-hub.md), [snaptrade-import](snaptrade-import.md).

## 16. Open questions / planned work
- Notify voters when a broker lands.
