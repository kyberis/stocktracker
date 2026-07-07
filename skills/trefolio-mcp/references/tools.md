# trefolio MCP tools

Server: `https://trefolio.com/api/mcp/user/mcp`  
Transport: Streamable HTTP  
Discovery: `https://trefolio.com/.well-known/mcp.json`

## Portfolio (read-only)

### listPortfolios

Returns all portfolios for the authenticated user.

**Input:** `{}`

### listHoldings

Returns holdings with stored EUR values and metadata (purchase price, sector, region, exchange).

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `portfolioId` | string | No — omit for all portfolios |

### listCash

Returns cash positions.

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `portfolioId` | string | No |

### getPortfolioSummary

Live portfolio summary with Yahoo quotes: totals, gain/loss, day change, top holdings, allocation, cash.

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `portfolioId` | string | No |
| `baseCurrency` | string | No — defaults to user's default portfolio currency |
| `includeDividends` | boolean | No — attach dividend estimates to top holdings |
| `includeGoals` | boolean | No — attach savings goals progress |

### getQuotes

Current quotes for up to 10 tickers (Yahoo).

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `tickers` | string[] | Yes — max 10 |

## Activity

### listTransactions

Portfolio transactions with optional filters.

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `portfolioId` | string | No |
| `holdingId` | string | No |
| `type` | `buy` \| `sell` \| `dividend` \| `fee` | No |
| `since` | string (ISO) | No |
| `limit` | number | No — max 500 |

### getDividendSummary

Estimated forward dividend income plus received dividends by year. Not tax advice.

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `portfolioId` | string | No |
| `baseCurrency` | string | No |

## Analysis

### screenStocks

Filter the cached stock screener universe (~600 symbols). Uses `screener` quota.

**Input:** `sector`, `industry`, `divYieldMin`, `divYieldMax`, `peMin`, `peMax`, `marketCap`, `exchange`, `country`, `sortBy`, `sortDir`, `page`, `limit` — all optional.

### listAlerts

Active price alerts.

**Input:** `{}`

### listWatchlist

Watchlist tickers.

**Input:** `{}`

### getPortfolioNews

Headlines linked to portfolio holdings (cached feed).

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `portfolioId` | string | No |
| `maxArticles` | number | No — 5–25, default 15 |

## Planning & tax

### getTaxReport

Year-end tax report for a supported country (uses `tax_report` quota). Requires PAT scope `tax:read`. Not filing advice.

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `country` | string (ISO-2, e.g. `ES`) | Yes |
| `taxYear` | number | Yes |
| `portfolioId` | string | No |
| `filingStatus` | `single` \| `joint` | No |
| `italyRegime` | `dichiarativo` \| `amministrato` | No |
| `swedenAccountType` | `isk` \| `kf` \| `regular` | No |
| `portugalNhr` | boolean | No |
| `swissCanton` | string | No |

### getPortfolioScore

Cached AI portfolio score (if generated in the app). Requires `tools:read`.

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `portfolioId` | string | No |
| `history` | boolean | No — past scores |

## PAT scopes

Mint tokens at user.trefolio.com → Developer (or trefolio Profile → MCP). Default scopes: `portfolio:read`, `tools:read`, `warren:moat`.

| Scope | Tools |
|-------|-------|
| `portfolio:read` | listPortfolios, listHoldings, listCash, getPortfolioSummary, getQuotes |
| `tools:read` | listTransactions, getDividendSummary, screenStocks, listAlerts, listWatchlist, getPortfolioNews, getPortfolioScore |
| `warren:moat` | getMoatEvaluation, runMoatEvaluation, screenMoat, listMoatReports |
| `warren:ai` | generateMoatNarrative |
| `tax:read` | getTaxReport |
| `portfolio:write` | saveMoatReport |

Legacy tokens (created before scopes) retain full access until revoked.

## Warren MOAT

### getMoatEvaluation

Warren MOAT score for a symbol (cache or fresh).

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `symbol` | string | Yes |
| `fresh` | boolean | No — `true` runs a new evaluation (uses `stock_evaluation` quota) |

### runMoatEvaluation

Alias for `getMoatEvaluation` with `fresh: true` (discoverable name for “generate a MOAT”).

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `symbol` | string | Yes |

### generateMoatNarrative

AI markdown narrative for a MOAT evaluation (uses `ai_consult` quota).

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `symbol` | string | No if `evaluation` provided |
| `evaluation` | object | No if `symbol` provided |
| `language` | string | No — default `en` |

### listMoatReports

Saved MOAT reports for the user.

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `tags` | string[] | No |

### screenMoat

Filter the cached MOAT universe (Warren screener).

**Input:** `scoreMin`, `scoreMax`, `verdict`, `sector`, `peMax`, `marketCapMax`, `page`, `limit` — optional.

### saveMoatReport

Persist an evaluation to the user's MOAT library. **Write tool** — call only when the user asks to save.

**Input:** evaluation payload from `getMoatEvaluation` (see server schema)

## Recommended MOAT workflow

1. `runMoatEvaluation` or `getMoatEvaluation({ fresh: true })`
2. `generateMoatNarrative({ symbol, language: "es" })`
3. `saveMoatReport` — only if the user asks to save

## Quotas

| Tool | Quota key |
|------|-----------|
| `screenStocks` | `screener` |
| `getMoatEvaluation` / `runMoatEvaluation` (fresh) | `stock_evaluation` |
| `generateMoatNarrative` | `ai_consult` |

Prefer cached MOAT results unless the user requests an update.

## Ecosystem (Clara + Will)

Same `tfp_pat_…` token; separate MCP URLs. See `external/accounts/docs/mcp-ecosystem.md`.

| Server | URL | Scopes | Key tools |
|--------|-----|--------|-----------|
| Clara | `https://clara.trefolio.com/api/mcp/user/mcp` | `finance:read`, `finance:write` | `getSavingsSummary`, `getSavings`, expense/month tools |
| Will | `https://will.trefolio.com/api/mcp/user/mcp` | `notes:read`, `notes:write` | `searchNotes`, `listRecentNotes`, `createNote` |

Do not use trefolio tools for Clara savings or Will notes — call the sister server directly.
