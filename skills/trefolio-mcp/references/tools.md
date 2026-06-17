# trefolio MCP tools

Server: `https://trefolio.com/api/mcp/user/mcp`  
Transport: Streamable HTTP  
Discovery: `https://trefolio.com/.well-known/mcp.json`

## Portfolio (read-only)

### listPortfolios

Returns all portfolios for the authenticated user.

**Input:** `{}`

### listHoldings

Returns holdings with stored EUR values.

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

## Warren MOAT

### getMoatEvaluation

Warren MOAT score for a symbol (cache or fresh).

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `symbol` | string | Yes |
| `fresh` | boolean | No — `true` runs a new evaluation (uses `stock_evaluation` quota) |

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

Filter the cached MOAT universe.

**Input:** `{}` (filters defined by server-side cache)

### saveMoatReport

Persist an evaluation to the user's MOAT library. **Write tool** — call only when the user asks to save.

**Input:** evaluation payload from `getMoatEvaluation` (see server schema)

## Quotas

Fresh MOAT fetch and AI narrative share quotas with the trefolio web app. Prefer cached results unless the user requests an update.
