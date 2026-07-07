# Exec plan: MCP full user data for external agents

- **Status:** completed (2026-07-07) — code complete locally; prod deploy pending push
- **Owner:** agent
- **Started:** 2026-07-07
- **Target:** 2026-08-04

## Goal

External AI clients (Claude, Cursor, etc.) authenticated with a unified `tfp_pat_…` token can read the same portfolio and tool data a Pro user sees in trefolio — holdings with context, dividends, transactions, stock screener, MOAT (evaluate + narrate + save), alerts, watchlist, and portfolio news — without a browser session. Sensitive writes stay behind UI confirmation; tax and granular PAT scopes ship in later phases.

## Acceptance criteria

### Phase 0 (legal + scopes design)
- [x] PAT scope model documented (`portfolio:read`, `tools:read`, `warren:moat`, `warren:ai`, `tax:read`, `finance:*`, `notes:*`).
- [x] `legal-advisor` review completed — see [Legal review (2026-07-07)](#legal-review-2026-07-07) below.

### Phase 1 (trefolio MCP read tools — done)
- [x] Shared services under `src/lib/services/` delegate to existing DAL/API logic.
- [x] MCP tools: `getPortfolioSummary`, `getQuotes`, enriched `listHoldings`.
- [x] MCP tools: `listTransactions`, `getDividendSummary`.
- [x] MCP tools: `screenStocks`, `listAlerts`, `listWatchlist`, `getPortfolioNews`.
- [x] MCP tool analytics records new tool names (existing `recordMcpRequestAnalytics` by tool name).
- [x] Unit tests for new services.
- [x] Skill + product spec + release notes updated.

### Phase 2 (MOAT clarity)
- [x] Skill documents full MOAT flow (`fresh:true` → narrative → save).
- [x] `runMoatEvaluation` alias for LLM discoverability.
- [x] Warren in-app `getMoatEvaluation` delegates to `getWarrenMoatEvaluation` (cache).

### Phase 3 (scopes + tier enforcement)
- [x] IdP PAT creation UI exposes scope checkboxes (accounts developer + trefolio Profile MCP).
- [x] Introspection returns `scopes[]`; MCP enforces per tool via `gateMcpTool`.
- [x] Default PAT scopes: `portfolio:read`, `tools:read`, `warren:moat`. Legacy tokens: full ecosystem access.

### Phase 4 (sister apps)
- [x] Clara MCP: `getSavingsSummary`, introspected scopes, `finance:read`/`finance:write` enforcement on savings tools.
- [x] Will MCP: `searchNotes`, `createNote`, introspected scopes, `notes:read`/`notes:write` enforcement.
- [x] `external/accounts/docs/mcp-ecosystem.md` routing table for agents.

### Phase 5 (P1 tools)
- [x] `getTaxReport` (Pro + `tax:read` scope + `tax_report` quota).
- [x] `getPortfolioScore` (cached read + `tools:read`).

## Legal review (2026-07-07)

**Trigger:** Phase 4 expands MCP to Clara financial data and Will note writes; Phase 3/5 expose tax and transactions via external MCP clients (user-chosen host, e.g. Claude Desktop).

**Legal basis (GDPR):** Contract (Art. 6(1)(b)) for features the user explicitly enables; legitimate interest for security/logging of PAT use. Opt-in scopes (`tax:read`, `notes:write`, `finance:write`) satisfy purpose limitation.

**Checklist**

| Item | Status | Notes |
|------|--------|-------|
| Privacy Policy reflects PAT + MCP data flows | ✅ Updated | Section 2 + Section 4 clarify scope-granted sensitive data and third-party MCP host |
| Terms cover developer token usage | ✅ Existing | User mints/revokes token on IdP; liability remains with user for client choice |
| Financial disclaimer on tax/MOAT MCP tools | ✅ | Tool descriptions + skill state "not tax/financial advice" |
| Third-party table (Anthropic/OpenAI via user's client) | ✅ | MCP host receives tool JSON responses user requests — disclosed as user-directed transfer |
| No new non-essential cookies | ✅ | PAT auth is Bearer header only |
| AI labeling | ✅ | MOAT narrative tools unchanged; MCP responses are structured JSON not presented as advice |
| Data minimization | ✅ | Per-tool scopes; default token excludes tax, Clara, Will write |
| Revocation | ✅ | IdP revoke immediately invalidates introspection |

**Residual risks / follow-ups**

- User education: Developer UI should warn that MCP clients are untrusted processors chosen by the user (already in ecosystem doc).
- Clara: full scope enforcement on all 30+ legacy tools is incremental (savings tools gated; route passes real scopes).
- Will: `createNote` is write without `confirm:` flag — acceptable for journal append; document in skill that agents should confirm with user before writing.

## Key files

| Area | Path |
|------|------|
| MCP route | `src/app/api/mcp/user/[transport]/route.ts` |
| Tool registration | `src/lib/mcp/user-server.ts` |
| MOAT (reference pattern) | `src/lib/services/warren-moat.ts`, `src/lib/mcp/moat-tools.ts` |
| Warren snapshot | `src/lib/ai/warren/build-snapshot.ts` |
| Skill | `skills/trefolio-mcp/SKILL.md`, `skills/trefolio-mcp/references/tools.md` |
| Spec | `knowledge/product-specs/trefolio-mcp-user.md` |
| IdP PAT | `external/accounts/docs/mcp-ecosystem.md` |
| Clara MCP | `external/etracker/src/lib/mcp/savings-summary-tool.ts` |
| Will MCP | `external/notetaker/src/lib/mcp/user-server.ts` |

## Decisions log

- 2026-07-07: Extend trefolio MCP (not proxy via Clara). MCP = external PAT clients; Office = internal `IDP_SERVICE_TOKEN` REST per `agent-office.md`.
- 2026-07-07: Phase 1 read-only except existing `saveMoatReport`. No `addHolding` / `removeHolding` via external MCP.
- 2026-07-07: `getPortfolioSummary` and `getQuotes` may call Yahoo (same as Warren/Telegram); stored-only tools stay default for lightweight reads.
- 2026-07-07: Legacy PATs (null `scopes_json`) grant full ecosystem scopes including Clara and Will.

## Risks

| Risk | Mitigation |
|------|------------|
| PAT leak exposes transactions/tax | Phase 3 scopes; opt-in sensitive scopes; revoke on IdP |
| Quote/MOAT quota abuse | Reuse `requireFeatureQuotaByUserId`; rate limits in Upstash |
| Service drift vs API routes | Single service layer; API routes refactor to delegate later |
| Legal (third-party AI + financial data) | Phase 0 legal-advisor; disclaimers in MCP skill + tool descriptions |

## Follow-ups

- Refactor `/api/screener`, `/api/transactions` GET to call new services (optional dedup).
- OpenAPI section `mcp` listing all tools.
- Landing `/landing/mcp` feature grid update when Phase 1 ships.
- Clara: gate all MCP tools with `finance:read`/`finance:write` map (incremental).

## Prod verification (2026-07-07)

| Check | Result |
|-------|--------|
| `/.well-known/mcp.json` trefolio / Clara / Will | ✅ HTTP 200 |
| MCP POST without auth | ✅ 401 (routes live) |
| trefolio prod deploy | ⚠️ Last 2 main deploys **ERROR** (IdP `call` export + route types) — **fixed locally**, build passes |
| Phase 4 tools in prod | ❌ Not yet — `getSavingsSummary`, `createNote`, ecosystem scopes uncommitted in sister repos |
| Current prod SHA (trefolio) | `89c06c13` (2026-05-28) — MCP MOAT baseline only |

**Next:** commit + push stocktracker, etracker, notetaker, accounts → confirm Vercel production READY → list tools with PAT.
