# trefolio-mcp-user

> HTTP MCP endpoint for read-only portfolio access using the unified IdP personal access token (`tfp_pat_…`).

## 1. Summary

Authenticated MCP clients (Cursor, Claude, etc.) call `/api/mcp/user` with `Authorization: Bearer tfp_pat_…`. The token is validated server-to-server against **trefolio-accounts** (`/api/v1/pat/introspect`); the IdP `sub` is mapped to a local user via `users.idp_sub`. Tools expose portfolio data, tool outputs (transactions, dividends, screener, news), and Warren MOAT. Live quotes via `getPortfolioSummary` / `getQuotes`; stored EUR values via `listHoldings` / `listCash`. See exec plan [`mcp-full-user-data`](../exec-plans/active/mcp-full-user-data.md).

## 2. Status

- **Tier:** available when IdP + `TREFOLIO_PAT_INTROSPECTION_SECRET` are configured; otherwise introspection fails and MCP auth returns 401.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-integrations/SKILL.md`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | `src/app/api/mcp/user/[transport]/route.ts` | GET/POST/DELETE; `mcp-handler` + `withMcpAuth` |
| Discovery | `src/app/.well-known/mcp.json/route.ts` | Static JSON; links to IdP developer page for token |
| Lib | `src/lib/mcp/*` (user-server, portfolio/activity/analysis/moat tools, pat-auth) | Tool registration + auth |
| Lib | `src/lib/services/*` (portfolio-snapshot, transactions-list, dividend-summary, screener-query, portfolio-news, warren-moat) | Domain services |

## 4. Data model

Uses existing `users`, `portfolios`, `holdings`, `cash_entries`, `transactions`, screener/moat caches, portfolio news — no new tables.

Implementation files: `src/app/api/mcp/user/[transport]/route.ts`, `src/app/.well-known/mcp.json/route.ts`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET/POST/DELETE | `/api/mcp/user` | Bearer `tfp_pat_` | Pro/Free (same as app user) | MCP stream/session |
| GET | `/.well-known/mcp.json` | none | — | MCP discovery document |

## 6. UI surface

**Profile → Devices → AI & MCP access** (`ProfileMcpSection`) links to **user.trefolio.com → Developer** for PAT mint/revoke; shows MCP endpoint URL, Claude Desktop config (`claude_desktop_config.json`), and Cursor snippet.

### Claude Desktop (important)

Claude **Settings → Connectors → Custom connector** expects **OAuth Client ID**. trefolio MCP uses **`tfp_pat_…` bearer tokens**, not OAuth — there is no Client ID. Users must edit `claude_desktop_config.json` with `type: "http"` and `Authorization: Bearer tfp_pat_…`. Public doc: `/api/docs/claude-desktop`.

## 7. Business logic

- `introspectTfpPat` → `{ sub, token_id }` with short in-memory cache (hash key).
- `findUserIdByIdpSub(sub)` → local `userId`.
- Tools: **Portfolio** — `listPortfolios`, `listHoldings`, `listCash`, `getPortfolioSummary`, `getQuotes`. **Activity** — `listTransactions`, `getDividendSummary`. **Analysis** — `screenStocks`, `listAlerts`, `listWatchlist`, `getPortfolioNews`, `getPortfolioScore`. **Planning** — `getTaxReport`. **MOAT** — `getMoatEvaluation`, `runMoatEvaluation`, `generateMoatNarrative`, `listMoatReports`, `screenMoat`, `saveMoatReport`. **FMP** — `listFmpEndpoints`, `fmpRequest` (generic GET proxy to FMP stable API; Pro + `market:fmp` + flag `mcp_fmp_proxy` + FMP rate limit). PAT scopes enforced per tool (`portfolio:read`, `tools:read`, `warren:moat`, `warren:ai`, `tax:read`, `portfolio:write`, `market:fmp`).

## 8. External dependencies

- **IdP:** `POST {IDP_ISSUER or IDP_BASE_URL}/api/v1/pat/introspect` with `Authorization: Bearer TREFOLIO_PAT_INTROSPECTION_SECRET`.
- **Env:** `TREFOLIO_PAT_INTROSPECTION_SECRET`, `IDP_BASE_URL` / `IDP_ISSUER`, `FMP_API_KEY` (see `.env.local.example`).
- **FMP:** `listFmpEndpoints` / `fmpRequest` call Financial Modeling Prep stable API with the server key.
- **Rate limits:** `mcpUserRateLimiter`, `mcpUserUnauthRateLimiter` in `src/lib/upstash.ts` (Upstash Redis when configured). FMP tools also use `checkFmpRateLimit` (15/min).

## 9. Currency / FX / tax implications

Holdings expose `valueInEUR` and `displayCurrency` as stored; `getPortfolioSummary` / `getQuotes` fetch live Yahoo data. Dividend and tax figures are educational — not filing advice. FMP MCP responses are informational market data only.

## 10. i18n

Discovery and errors are English-only; product UI is unaffected.

## 11. Permissions / tier gating / rate limits

- Middleware allows `/api/mcp/user` without session cookie; authorization is bearer-only inside the route.
- Per-user and per-IP limits when Redis is configured.
- FMP tools: Pro plan (admins bypass), PAT scope `market:fmp`, feature flag `mcp_fmp_proxy` (on by default), and FMP per-user rate limit on `fmpRequest`.

## 12. Telemetry

`mcp_analytics_events` via `recordMcpRequestAnalytics` (initialize + tool_call per tool name). Admin tab `/admin/mcp-analytics`.

## 13. Testing

- Unit: `src/lib/mcp/trefolio-pat-auth.test.ts`, `src/lib/mcp/fmp-proxy.test.ts`, `src/lib/mcp/fmp-endpoint-catalog.test.ts`, `src/lib/services/portfolio-snapshot.test.ts`, `src/lib/services/transactions-list.test.ts`, `src/lib/services/warren-moat.test.ts`.

## 14. Rollout / migration

Deploy IdP PAT + secret first; set matching `TREFOLIO_PAT_INTROSPECTION_SECRET` on trefolio. Canonical client config: [`external/accounts/docs/mcp-ecosystem.md`](../../external/accounts/docs/mcp-ecosystem.md).

## 15. Open questions

- Phase 0: `legal-advisor` review before marketing tax MCP to external agents.
- Phase 4: Clara/Will MCP servers — see exec plan `mcp-full-user-data`.
- Optional: expand live quote tools behind stricter caps.
- FMP MCP proxy shipped as generic `fmpRequest` + curated `listFmpEndpoints`; catalog is discovery-only (not an allowlist).
