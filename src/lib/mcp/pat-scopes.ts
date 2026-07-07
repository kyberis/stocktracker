/** MCP PAT scopes — keep in sync with external/accounts/src/lib/pat-scopes.ts */
export const TREFOLIO_PAT_SCOPE_IDS = [
  "portfolio:read",
  "tools:read",
  "warren:moat",
  "warren:ai",
  "tax:read",
  "portfolio:write",
] as const;

export const CLARA_PAT_SCOPE_IDS = ["finance:read", "finance:write"] as const;

export const WILL_PAT_SCOPE_IDS = ["notes:read", "notes:write"] as const;

export const MCP_PAT_SCOPE_IDS = [
  ...TREFOLIO_PAT_SCOPE_IDS,
  ...CLARA_PAT_SCOPE_IDS,
  ...WILL_PAT_SCOPE_IDS,
] as const;

export type McpPatScope = (typeof MCP_PAT_SCOPE_IDS)[number];

export type TrefolioMcpScope = (typeof TREFOLIO_PAT_SCOPE_IDS)[number];

export const DEFAULT_MCP_PAT_SCOPES: TrefolioMcpScope[] = [
  "portfolio:read",
  "tools:read",
  "warren:moat",
];

export const LEGACY_MCP_PAT_SCOPES: McpPatScope[] = [...MCP_PAT_SCOPE_IDS];

export const ALL_MCP_PAT_SCOPES: McpPatScope[] = [...MCP_PAT_SCOPE_IDS];

export const MCP_PAT_SCOPE_LABELS: Record<McpPatScope, { title: string; description: string }> = {
  "portfolio:read": { title: "Portfolio read", description: "Holdings, cash, summary, quotes" },
  "tools:read": { title: "Tools read", description: "Transactions, dividends, screener, news, score" },
  "warren:moat": { title: "Warren MOAT", description: "MOAT evaluation and screener" },
  "warren:ai": { title: "MOAT AI narrative", description: "AI markdown narrative (ai_consult quota)" },
  "tax:read": { title: "Tax reports", description: "Year-end tax data (sensitive)" },
  "portfolio:write": { title: "Save MOAT reports", description: "Persist MOAT to your library" },
  "finance:read": { title: "Clara read", description: "Budget, expenses, savings via Clara MCP" },
  "finance:write": { title: "Clara write", description: "Mutating Clara tools (confirm required)" },
  "notes:read": { title: "Will read", description: "Search and list notes via Will MCP" },
  "notes:write": { title: "Will write", description: "Create notes via Will MCP" },
};

export function isMcpPatScope(value: string): value is McpPatScope {
  return (MCP_PAT_SCOPE_IDS as readonly string[]).includes(value);
}

export function isTrefolioMcpScope(value: string): value is TrefolioMcpScope {
  return (TREFOLIO_PAT_SCOPE_IDS as readonly string[]).includes(value);
}

export function resolveEffectiveMcpPatScopes(stored: McpPatScope[] | null | undefined): McpPatScope[] {
  if (stored == null) return LEGACY_MCP_PAT_SCOPES;
  return stored.length > 0 ? stored : DEFAULT_MCP_PAT_SCOPES;
}

export function hasMcpScope(granted: readonly string[], required: TrefolioMcpScope): boolean {
  return granted.includes(required);
}

/** Required scope per MCP tool name (trefolio tools only). */
export const MCP_TOOL_REQUIRED_SCOPE: Record<string, TrefolioMcpScope> = {
  listPortfolios: "portfolio:read",
  listHoldings: "portfolio:read",
  listCash: "portfolio:read",
  getPortfolioSummary: "portfolio:read",
  getQuotes: "portfolio:read",
  listTransactions: "tools:read",
  getDividendSummary: "tools:read",
  screenStocks: "tools:read",
  listAlerts: "tools:read",
  listWatchlist: "tools:read",
  getPortfolioNews: "tools:read",
  getPortfolioScore: "tools:read",
  getTaxReport: "tax:read",
  getMoatEvaluation: "warren:moat",
  runMoatEvaluation: "warren:moat",
  screenMoat: "warren:moat",
  listMoatReports: "warren:moat",
  generateMoatNarrative: "warren:ai",
  saveMoatReport: "portfolio:write",
};

export function requiredScopeForMcpTool(toolName: string): TrefolioMcpScope | undefined {
  return MCP_TOOL_REQUIRED_SCOPE[toolName];
}
