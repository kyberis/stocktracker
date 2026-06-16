import { getPublicDocsSiteUrl } from "./site";

export type PublicDocSectionId =
  | "overview"
  | "authentication"
  | "mcp"
  | "warren-moat"
  | "warren-chat"
  | "portfolio";

export interface PublicDocSectionSummary {
  id: PublicDocSectionId;
  title: string;
  description: string;
  url: string;
}

export interface PublicDocSection extends PublicDocSectionSummary {
  content: Record<string, unknown>;
}

const MOAT_CRITERIA = [
  {
    key: "earnings_consistency",
    name: "Earnings Consistency",
    benchmark: "Steady growth, no erratic swings",
  },
  {
    key: "gross_margin",
    name: "Gross Margin",
    benchmark: "Stable or improving gross margin over 10 years",
  },
  {
    key: "net_margin",
    name: "Net Margin",
    benchmark: "Healthy and stable net margin",
  },
  {
    key: "retained_earnings",
    name: "Retained Earnings",
    benchmark: "Growing retained earnings over time",
  },
  {
    key: "return_on_equity",
    name: "Return on Equity",
    benchmark: "Consistent ROE without excessive leverage",
  },
  {
    key: "debt_sustainability",
    name: "Debt Sustainability",
    benchmark: "Manageable debt relative to earnings",
  },
  {
    key: "capex_efficiency",
    name: "CapEx Efficiency",
    benchmark: "Capital expenditure aligned with maintenance vs growth",
  },
  {
    key: "product_durability",
    name: "Product Durability",
    benchmark: "Business model resilience and pricing power",
  },
] as const;

const MOAT_VERDICTS = [
  { minPct: 70, label: "Strong Durable Competitive Advantage" },
  { minPct: 50, label: "Moderate Competitive Advantage" },
  { minPct: 35, label: "Narrow Moat — Proceed with Caution" },
  { minPct: 0, label: "No Clear Moat Detected" },
] as const;

function sectionUrl(id: PublicDocSectionId): string {
  return `${getPublicDocsSiteUrl()}/api/docs/${id}`;
}

export function listPublicDocSections(): PublicDocSectionSummary[] {
  return [
    {
      id: "overview",
      title: "Overview",
      description: "How LLMs and external agents integrate with trefolio.",
      url: sectionUrl("overview"),
    },
    {
      id: "authentication",
      title: "Authentication",
      description: "Session cookies, personal access tokens (MCP), and tier gating.",
      url: sectionUrl("authentication"),
    },
    {
      id: "mcp",
      title: "MCP (Model Context Protocol)",
      description: "Read-only portfolio tools for Cursor, Claude Desktop, and compatible clients.",
      url: sectionUrl("mcp"),
    },
    {
      id: "warren-moat",
      title: "Warren MOAT evaluation",
      description:
        "Buffett-style competitive advantage scoring, AI narrative, screener, and saved reports.",
      url: sectionUrl("warren-moat"),
    },
    {
      id: "warren-chat",
      title: "Warren AI chat",
      description: "Streaming portfolio assistant with optional attachments.",
      url: sectionUrl("warren-chat"),
    },
    {
      id: "portfolio",
      title: "Portfolio REST API",
      description: "Holdings, transactions, quotes — session-authenticated REST surface.",
      url: sectionUrl("portfolio"),
    },
  ];
}

export function getPublicDocSection(id: string): PublicDocSection | null {
  const site = getPublicDocsSiteUrl();
  switch (id as PublicDocSectionId) {
    case "overview":
      return {
        id: "overview",
        title: "Overview",
        description: "How LLMs and external agents integrate with trefolio.",
        url: sectionUrl("overview"),
        content: {
          product: "trefolio",
          tagline: "European multi-currency portfolio tracker with Warren AI and MOAT analysis.",
          integration_paths: [
            {
              id: "mcp",
              recommended: true,
              summary:
                "Use MCP with a user-issued `tfp_pat_…` token: portfolio reads (listPortfolios, listHoldings, listCash) and Warren MOAT (getMoatEvaluation, generateMoatNarrative, screenMoat, listMoatReports, saveMoatReport).",
              discovery: `${site}/.well-known/mcp.json`,
              endpoint: `${site}/api/mcp/user`,
            },
            {
              id: "openapi",
              recommended: false,
              summary:
                "OpenAPI describes session-authenticated REST endpoints (Warren MOAT, Warren chat, portfolio CRUD). Requires an active browser session cookie after OIDC login.",
              spec: `${site}/openapi.json`,
            },
          ],
          discovery: {
            docs_index: `${site}/api/docs`,
            openapi: `${site}/openapi.json`,
            mcp: `${site}/.well-known/mcp.json`,
            ai_plugin: `${site}/.well-known/ai-plugin.json`,
            llms_txt: `${site}/llms.txt`,
          },
          disclaimer:
            "Not financial advice. MOAT scores and AI narratives are educational tools based on fundamental data; users must do their own research.",
        },
      };
    case "authentication":
      return {
        id: "authentication",
        title: "Authentication",
        description: "Session cookies, personal access tokens (MCP), and tier gating.",
        url: sectionUrl("authentication"),
        content: {
          methods: [
            {
              id: "session_cookie",
              header: "Cookie: trefolio_session=<jwt>",
              used_by: ["Warren MOAT REST", "Warren chat", "portfolio REST"],
              obtain: "Sign in at trefolio.com (OIDC via user.trefolio.com when unified accounts are enabled).",
            },
            {
              id: "bearer_pat",
              header: "Authorization: Bearer tfp_pat_<64-hex>",
              used_by: ["MCP /api/mcp/user only"],
              obtain: "Mint at user.trefolio.com → Developer, or from trefolio Profile → Devices → AI & MCP access.",
            },
          ],
          tiers: {
            free: "Folio plan — limited AI and MOAT quotas.",
            pro: "Trefolio plan — higher quotas; MOAT evaluation and Warren AI narrative require Pro for fresh runs.",
          },
        },
      };
    case "mcp":
      return {
        id: "mcp",
        title: "MCP (Model Context Protocol)",
        description: "Portfolio + Warren MOAT tools for Cursor, Claude Desktop, and compatible clients.",
        url: sectionUrl("mcp"),
        content: {
          transport: "HTTP (Streamable HTTP via mcp-handler)",
          base_url: `${site}/api/mcp/user`,
          discovery: `${site}/.well-known/mcp.json`,
          auth: {
            type: "bearer",
            token_prefix: "tfp_pat_",
            token_docs: `${site}/api/docs/authentication`,
          },
          tools: [
            {
              name: "listPortfolios",
              description: "Portfolios for the authenticated user.",
              input: {},
            },
            {
              name: "listHoldings",
              description: "Holdings with stored EUR values (optional portfolioId filter).",
              input: { portfolioId: "string, optional" },
            },
            {
              name: "listCash",
              description: "Cash positions (optional portfolioId filter).",
              input: { portfolioId: "string, optional" },
            },
            {
              name: "getMoatEvaluation",
              description: "Warren MOAT score (cache or fresh with stock_evaluation quota).",
              input: { symbol: "string", fresh: "boolean, optional" },
            },
            {
              name: "generateMoatNarrative",
              description: "Warren AI markdown narrative (ai_consult quota).",
              input: { symbol: "string, optional", evaluation: "object, optional", language: "string" },
            },
            {
              name: "listMoatReports",
              description: "Saved MOAT reports for the user.",
              input: { tags: "string[], optional" },
            },
            { name: "screenMoat", description: "Filter cached MOAT universe.", input: {} },
            { name: "saveMoatReport", description: "Persist evaluation to user library.", input: {} },
          ],
          cursor_example: {
            mcpServers: {
              trefolio: {
                url: `${site}/api/mcp/user/mcp`,
                headers: { Authorization: "Bearer tfp_pat_YOUR_TOKEN_HERE" },
              },
            },
          },
          note: "Portfolio tools use stored values. MOAT fresh fetch and AI narrative consume user quotas (same as the web app).",
        },
      };
    case "warren-moat":
      return {
        id: "warren-moat",
        title: "Warren MOAT evaluation",
        description:
          "Buffett-style competitive advantage scoring, AI narrative, screener, and saved reports.",
        url: sectionUrl("warren-moat"),
        content: {
          framework: "Warren Buffett durable competitive advantage (economic moat)",
          scoring: {
            criteria_count: 8,
            max_score_per_criterion: 12.5,
            max_total_score: 100,
            criteria: MOAT_CRITERIA,
            verdicts: MOAT_VERDICTS,
            valuation_signals: {
              pe_ratio: "Price/earnings; sell trigger at ≥40 in the Buffett framework",
              forward_pe: "Price vs next-year estimated earnings",
              peg_ratio: "P/E divided by earnings growth; below 1 suggests growth-adjusted value",
              augmented_payout_ratio: "Dividends + buybacks as % of net income",
            },
          },
          endpoints: [
            {
              method: "GET",
              path: "/api/stock-evaluation",
              auth: "session",
              tier: "Pro quota for fresh evaluation (`stock_evaluation`); cached reads are session-only",
              query: {
                symbol: "required ticker, e.g. AAPL",
                fresh: "optional `1` to bypass cache and re-fetch fundamentals",
              },
              response: "MoatEvaluation JSON (criteria, verdict, valuation block)",
            },
            {
              method: "POST",
              path: "/api/stock-evaluation/ai",
              auth: "session",
              tier: "Pro (`ai_consult` quota)",
              body: {
                evaluation: "MoatEvaluation object from GET /api/stock-evaluation",
                language: "optional BCP-47 language code (default en)",
              },
              response: "text/event-stream — Warren AI narrative markdown",
            },
            {
              method: "GET",
              path: "/api/moat-screener",
              auth: "session",
              query: {
                action: "`meta` for cache stats",
                scoreMin: "number",
                scoreMax: "number",
                verdict: "string",
                sector: "string",
                industry: "string",
                peMin: "number",
                peMax: "number",
                marketCapMin: "number",
                marketCapMax: "number",
                sortBy: "score | symbol | pe | marketCap (default score)",
                sortDir: "asc | desc",
                page: "number",
                limit: "number (default 20)",
              },
              response: "Paginated moat cache rows",
            },
            {
              method: "GET",
              path: "/api/moat-reports",
              auth: "session",
              query: { tags: "optional comma-separated filter" },
              response: "User saved MOAT reports",
            },
            {
              method: "POST",
              path: "/api/moat-reports",
              auth: "session",
              body: {
                symbol: "required",
                companyName: "optional",
                evaluationJson: "required stringified MoatEvaluation",
                totalScore: "number",
                maxScore: "number",
                verdict: "string",
                tags: "string[]",
              },
            },
          ],
          typical_flow: [
            "MCP getMoatEvaluation { symbol: \"KO\" } — or GET /api/stock-evaluation?symbol=KO",
            "MCP generateMoatNarrative { symbol: \"KO\" } — or POST /api/stock-evaluation/ai",
            "MCP saveMoatReport — or POST /api/moat-reports",
            "MCP screenMoat — or GET /api/moat-screener",
          ],
          ui_path: "/tools/moat-evaluation",
          data_source: "FMP or Alpha Vantage fundamentals (server-selected)",
        },
      };
    case "warren-chat":
      return {
        id: "warren-chat",
        title: "Warren AI chat",
        description: "Streaming portfolio assistant with optional attachments.",
        url: sectionUrl("warren-chat"),
        content: {
          endpoint: {
            method: "POST",
            path: "/api/warren/chat",
            auth: "session",
            tier: "ai_consult quota",
          },
          content_types: [
            "application/json — messages array",
            "multipart/form-data — payload JSON + userText + files[]",
          ],
          json_body: {
            messages: [{ role: "user | assistant", content: "string (max 12000)" }],
            language: "optional",
            activePortfolioId: "optional",
            activePortfolioName: "optional",
            baseCurrency: "default EUR",
            portfolioContext: "optional Warren portfolio snapshot",
          },
          response: "text/event-stream — WarrenStreamFrame JSON lines",
          related: {
            confirm_proposals: "POST /api/warren/confirm",
          },
        },
      };
    case "portfolio":
      return {
        id: "portfolio",
        title: "Portfolio REST API",
        description: "Holdings, transactions, quotes — session-authenticated REST surface.",
        url: sectionUrl("portfolio"),
        content: {
          note: "Full route list is in openapi.json. Prefer MCP for agent read access.",
          common_routes: [
            "GET /api/holdings",
            "GET /api/portfolios",
            "GET /api/transactions",
            "GET /api/quote",
            "POST /api/portfolio/ai-chat",
          ],
          openapi: `${site}/openapi.json`,
        },
      };
    default:
      return null;
  }
}

export function isPublicDocSectionId(id: string): id is PublicDocSectionId {
  return listPublicDocSections().some((s) => s.id === id);
}
