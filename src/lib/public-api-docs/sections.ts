import { buildClaudeDesktopMcpConfigSnippet } from "@/lib/mcp/public-config";
import { getMcpStreamableHttpUrl } from "@/lib/mcp/mcp-oauth-discovery";

import { getPublicDocsSiteUrl } from "./site";

export type PublicDocSectionId =
  | "overview"
  | "authentication"
  | "mcp"
  | "claude-desktop"
  | "claude-connectors"
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
    benchmark:
      "Rising RE without buybacks; if the company repurchases shares, require FCF-funded buybacks instead of RE growth",
  },
  {
    key: "return_on_invested_capital",
    name: "Return on Invested Capital",
    benchmark: "ROIC ≥ 15% (NOPAT / invested capital; not ROE)",
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
      description: "Portfolio + Warren MOAT tools for Cursor and compatible MCP clients.",
      url: sectionUrl("mcp"),
    },
    {
      id: "claude-desktop",
      title: "Claude Desktop setup",
      description:
        "Why Custom Connector asks for OAuth Client ID, and how to connect with a personal access token instead.",
      url: sectionUrl("claude-desktop"),
    },
    {
      id: "claude-connectors",
      title: "Claude Connectors Directory (marketplace)",
      description:
        "OAuth requirements, server URL, and submission checklist for listing trefolio in Claude's connector marketplace.",
      url: sectionUrl("claude-connectors"),
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
            docs_html: `${site}/docs`,
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
              obtain: "Sign in at trefolio.com (OIDC via user.trefolio.com when OneLogin is enabled).",
            },
            {
              id: "bearer_pat",
              header: "Authorization: Bearer tfp_pat_<64-hex>",
              used_by: ["MCP /api/mcp/user only"],
              obtain: "Mint at user.trefolio.com → Developer, or from trefolio Profile → Devices → AI & MCP access.",
              claude_desktop_note:
                "Claude Settings → Connectors → Custom connector asks for OAuth Client ID. trefolio does NOT use OAuth for MCP — use claude_desktop_config.json with type http and Authorization Bearer header instead.",
              claude_desktop_config_path:
                "~/Library/Application Support/Claude/claude_desktop_config.json (macOS)",
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
    case "claude-desktop": {
      const mcpBase = `${site}/api/mcp/user`;
      const configExample = JSON.parse(buildClaudeDesktopMcpConfigSnippet(mcpBase)) as Record<
        string,
        unknown
      >;
      return {
        id: "claude-desktop",
        title: "Claude Desktop setup",
        description:
          "Why Custom Connector asks for OAuth Client ID, and how to connect with a personal access token instead.",
        url: sectionUrl("claude-desktop"),
        content: {
          problem:
            "Claude Desktop → Settings → Connectors → Add custom connector shows OAuth fields (Client ID, Client Secret). trefolio MCP does NOT use OAuth — it uses a personal access token (`tfp_pat_…`). There is no Client ID to provide.",
          do_not_use:
            "Do not enter your PAT in the OAuth Client ID field. That field is for OAuth client registration, not API keys.",
          supported_path: "Edit the Claude Desktop config file and pass the token in an Authorization header.",
          config_file_macos: "~/Library/Application Support/Claude/claude_desktop_config.json",
          config_file_windows: "%APPDATA%\\Claude\\claude_desktop_config.json",
          steps: [
            "Mint `tfp_pat_…` at trefolio Profile → Developer · MCP (`/profile?section=mcp`).",
            "Quit Claude Desktop completely.",
            "Paste the JSON below into claude_desktop_config.json (merge with existing mcpServers if needed).",
            "Replace tfp_pat_YOUR_TOKEN_HERE with your real token.",
            "Restart Claude Desktop.",
          ],
          claude_desktop_config: configExample,
          claude_code_cli:
            "claude mcp add --transport http trefolio https://trefolio.com/api/mcp/user/mcp --header \"Authorization: Bearer tfp_pat_YOUR_TOKEN\"",
          cursor_note: "Cursor uses ~/.cursor/mcp.json with the same url + headers pattern (see /api/docs/mcp).",
          claude_web_note:
            "claude.ai Connectors Directory uses OAuth 2.0 (not static Bearer tokens). See /docs/claude-connectors for marketplace listing. Custom connectors in Claude Desktop can still use PAT via claude_desktop_config.json.",
          claude_connectors_docs: `${site}/docs/claude-connectors`,
          token_mint: `${site}/profile?section=mcp`,
          docs: `${site}/api/docs/authentication`,
        },
      };
    }
    case "claude-connectors": {
      const mcpUrl = getMcpStreamableHttpUrl();
      return {
        id: "claude-connectors",
        title: "Claude Connectors Directory (marketplace)",
        description:
          "OAuth requirements, server URL, and submission checklist for listing trefolio in Claude's connector marketplace.",
        url: sectionUrl("claude-connectors"),
        content: {
          summary:
            "Remote MCP server for portfolio reads and Warren MOAT analysis. Listed via Anthropic's Connectors Directory (Claude marketplace).",
          server_url: mcpUrl,
          transport: "Streamable HTTP (POST JSON-RPC to /api/mcp/user/mcp)",
          auth: {
            type: "oauth2",
            authorization_server: "https://user.trefolio.com",
            protected_resource_metadata: `${site}/.well-known/oauth-protected-resource`,
            oauth_callback: "https://claude.ai/api/mcp/auth_callback",
            oauth_client_id: "claude-mcp",
            anthropic_held_credentials:
              "Email mcp-review@anthropic.com with claude-mcp client_id + secret if DCR is unavailable.",
            pat_alternative:
              "Cursor and Claude Desktop config file still support `Authorization: Bearer tfp_pat_…` (not accepted in the public directory UI).",
          },
          documentation_url: `${site}/docs`,
          privacy_policy_url: `${site}/privacy`,
          support_contact: "https://trefolio.com/contact",
          example_prompts: [
            "List my portfolios and show holdings with stored EUR values.",
            "Run a Warren MOAT evaluation for AAPL and summarize the verdict.",
            "Screen my MOAT universe for scores above 70 in the technology sector.",
          ],
          tools_read_only: [
            "listPortfolios",
            "listHoldings",
            "listCash",
            "getMoatEvaluation",
            "generateMoatNarrative",
            "listMoatReports",
            "screenMoat",
          ],
          tools_write: ["saveMoatReport"],
          submission_portal:
            "Claude.ai → Admin settings → Directory (Team/Enterprise) or https://claude.com/docs/connectors/building/submission",
          review_email: "mcp-review@anthropic.com",
          prerequisites: [
            "HTTPS server URL",
            "OAuth 401 with WWW-Authenticate resource_metadata on unauthenticated requests",
            "Every tool has title + readOnlyHint or destructiveHint",
            "Public docs + privacy policy URLs",
            "Test account credentials for reviewers",
          ],
          troubleshooting: [
            {
              issue: "401 / missing auth / expired OAuth token",
              resolution:
                "Reconnect the connector in Claude.ai to refresh the OAuth access token. Unauthenticated MCP requests return 401 with WWW-Authenticate resource_metadata pointing at /.well-known/oauth-protected-resource.",
            },
            {
              issue: "user_not_linked (IdP account not linked to trefolio user)",
              resolution:
                "OAuth succeeded on user.trefolio.com but no local trefolio user matches that IdP subject. Sign in once at trefolio.com with the same account, then retry the connector.",
            },
            {
              issue: "MOAT quota errors (quota_exceeded)",
              resolution:
                "getMoatEvaluation with fresh=true consumes stock_evaluation quota; generateMoatNarrative consumes ai_consult quota. Omit fresh for cached reads, or upgrade tier when limits are hit.",
            },
            {
              issue: "OAuth callback failures",
              resolution:
                "Confirm oauth_callback is https://claude.ai/api/mcp/auth_callback, authorization_server is https://user.trefolio.com, client_id claude-mcp is registered with Anthropic, and CORS preflight (OPTIONS) succeeds on the MCP URL.",
            },
            {
              issue: "PAT vs OAuth confusion",
              resolution:
                "Connectors Directory uses OAuth 2.0 only. Claude Desktop config-file MCP uses Authorization: Bearer tfp_pat_… — see /docs/claude-desktop.",
            },
          ],
        },
      };
    }
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
