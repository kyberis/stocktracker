# portfolio-anomaly-agent

> Staff-only hybrid agent that scans portfolios with ≥1 holding for data anomalies, explains them with an LLM, and lets admins triage from `/admin/anomalies` or ProdOps Telegram buttons.

## 1. Summary

Operators need an early warning when user portfolios contain calculation or holdings integrity issues (missing FX, stale `value_in_eur`, ledger mismatches, ghost positions, snapshot spikes, etc.). A daily cron runs deterministic rules on users with at least one open holding, optionally asks the AI gateway for a short staff explanation + remediation prompt, persists rows in `portfolio_anomalies`, and enqueues a ProdOps `portfolio_anomaly` event. Admins act in the console or via Telegram inline buttons (ack / apply safe fix / dismiss) over the existing HMAC boundary.

## 2. Status

- **Tier:** Admin / operator only
- **Feature flag:** `portfolio_anomaly_agent` (off by default)
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-data/SKILL.md`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/admin/anomalies/page.tsx`](../../src/app/(app)/admin/anomalies/page.tsx) | Support → Anomalies |
| Component | [`src/app/(app)/admin/tabs/AnomaliesTab.tsx`](../../src/app/(app)/admin/tabs/AnomaliesTab.tsx) | Triage UI |
| API | [`src/app/api/admin/anomalies/route.ts`](../../src/app/api/admin/anomalies/route.ts) | List/detail + ack/dismiss/fix/rescan/rebuild |
| API | [`src/app/api/internal/prodops-action/route.ts`](../../src/app/api/internal/prodops-action/route.ts) | HMAC Telegram button actions |
| Cron | [`src/app/api/cron/portfolio-anomaly-scan/route.ts`](../../src/app/api/cron/portfolio-anomaly-scan/route.ts) | `15 3 * * *` |
| Lib | [`src/lib/portfolio-anomaly/`](../../src/lib/portfolio-anomaly/) | Rules, explain, repairs, scanner |
| External | [`external/prodops`](../../external/prodops) | Inline keyboard + callback_query → action API |

## 4. Data model

- `portfolio_anomalies` — triage rows (`status`, `severity`, `codes_json`, `findings_json`, `ai_explanation`, `remediation_prompt`, `fingerprint`, notification/resolution metadata). Migration `v140`.
- Types: `PortfolioAnomaly`, `PortfolioAnomalyFinding`, `ProdOpsEventType` includes `portfolio_anomaly`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/admin/anomalies` | admin | Admin | List or fetch one anomaly |
| POST | `/api/admin/anomalies` | admin | Admin | ack / dismiss / apply_safe_fix / rescan / rebuild_holdings |
| POST | `/api/internal/prodops-action` | HMAC | Admin | Telegram button actions |
| GET/POST | `/api/cron/portfolio-anomaly-scan` | cron | Admin | Daily scan |

## 6. UI surface

- `/admin/anomalies` — filterable list + detail with AI explanation, remediation prompt, findings, actions.
- Admin Settings → ProdOps event toggle: `portfolio_anomaly`.
- Feature Flags → `portfolio_anomaly_agent`.

## 7. Business logic

1. Flag off → cron no-op.
2. Scan only users from `listUserIdsWithHoldings()`.
3. Rules: reuse `import-quality` auditor + integrity checks (`ghost_holding`, `zero_cost_basis`, `ledger_holdings_mismatch`, `value_eur_inconsistent`, `snapshot_spike`, `missing_exchange`).
4. Fingerprint open anomalies to avoid daily re-notify spam.
5. LLM (`gpt-4o-mini`) explains new findings; deterministic fallback if gateway fails.
6. Enqueue ProdOps with summary + admin URL + inline actions (`pa|{anomalyId}|ack|apply_safe_fix|dismiss`).
7. Telegram safe fixes only apply `autoFixable` actions (not rebuild/reset). Rebuild is admin-console only.

## 8. External dependencies

- OpenAI via AI gateway (staff explanations)
- `trefolio-prodops` + Telegram Bot API

## 9. Currency / FX / tax implications

Uses live quotes/FX for quality and `value_in_eur` consistency checks; does not change tax engine.

## 10. i18n

Admin + Telegram ops copy is English-only (staff surfaces).

## 11. Permissions / tier gating / rate limits

- Admin APIs: `requireAdmin()`
- Cron: `verifyCronAuth`
- ProdOps action: HMAC + linked recipient chatId
- LLM explanations capped per cron run (default 40)

## 12. Telemetry

- Cron executions via `withCronLogging`
- Outbox status in `ops_event_outbox`

## 13. Edge cases & gotchas

- SnapTrade vs ledger doubles: rebuild is not Telegram-auto-fixable.
- Same fingerprint while `open`/`acked` updates findings but does not re-notify.
- Telegram `callback_data` must stay ≤64 bytes (`pa|{uuid}|apply_safe_fix` fits).

## 14. Related docs

- [`ops-telegram-agent.md`](ops-telegram-agent.md)
- [`import-data-quality.md`](import-data-quality.md)
- [`../design-docs/trefolio-prodops-integration.md`](../design-docs/trefolio-prodops-integration.md)
