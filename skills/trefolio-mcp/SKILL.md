---
name: trefolio-mcp
description: Use when the user asks about their trefolio portfolios, holdings, cash, or Warren Buffett MOAT analysis via the trefolio MCP connector. Guides tool choice, OAuth/PAT setup, and financial disclaimers.
license: Proprietary — see https://trefolio.com/terms
---

# trefolio MCP — Portfolio & Warren MOAT

Use this skill when the user wants portfolio data or Warren MOAT analysis from their **trefolio** account through the MCP connector.

**Not investment advice.** MOAT scores and AI narratives are educational tools. Portfolio values use stored EUR amounts, not live market quotes.

## When to use

- User asks about their portfolios, holdings, cash, or allocation in trefolio
- User wants Warren Buffett MOAT evaluation, narrative, screening, or saved reports
- User needs help connecting trefolio MCP (Claude.ai OAuth, Claude Desktop PAT, Cursor)

## Connection

| Surface | Auth | Server URL |
|---------|------|------------|
| Claude.ai (Connectors Directory) | OAuth 2.0 via user.trefolio.com | `https://trefolio.com/api/mcp/user/mcp` |
| Claude Desktop / Cursor / CLI | Bearer `tfp_pat_…` PAT | Same URL + `Authorization: Bearer tfp_pat_…` |

- Mint PAT: https://user.trefolio.com/account/developer
- Setup guide: https://trefolio.com/docs/claude-connectors
- API docs: https://trefolio.com/api/docs/mcp
- Privacy: https://trefolio.com/privacy

## Recommended workflows

### Portfolio overview

1. `listPortfolios` — get portfolio IDs and names
2. `listHoldings` — pass optional `portfolioId` to filter
3. `listCash` — pass optional `portfolioId` for cash positions

Summarize in the user's preferred display currency when possible. Values are stored in EUR internally.

### Single-stock MOAT

1. `getMoatEvaluation` — `{ symbol: "MSFT" }`; set `fresh: true` only when user explicitly wants a new run (uses quota)
2. `generateMoatNarrative` — pass `symbol` and/or `evaluation`; set `language` (`en`, `es`, …)
3. `saveMoatReport` — only when user asks to persist the evaluation

### Browse saved research

1. `listMoatReports` — optional `tags` filter
2. `screenMoat` — filter the cached MOAT universe when user asks for ideas matching criteria

## Tool reference

See [references/tools.md](references/tools.md) for all eight tools, inputs, and quota notes.

## Guardrails

- Prefer read tools unless the user explicitly asks to save a MOAT report
- Do not invent holdings, scores, or prices — always call MCP tools
- Fresh MOAT evaluation and AI narrative consume the same quotas as the trefolio web app
- Clarify that portfolio tool output reflects last stored values, not real-time quotes
