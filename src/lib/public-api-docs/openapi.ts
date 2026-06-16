import { CURRENT_VERSION } from "@/lib/release-version";

import { getPublicDocsSiteUrl } from "./site";

const criterionResultSchema = {
  type: "object",
  required: ["key", "name", "status", "value", "score", "maxScore"],
  properties: {
    key: { type: "string" },
    name: { type: "string" },
    status: { type: "string", enum: ["pass", "warning", "fail"] },
    value: { type: "string" },
    numericValue: { type: "number", nullable: true },
    benchmark: { type: "string" },
    score: { type: "number" },
    maxScore: { type: "number" },
    trend: { type: "array", items: { type: "number" } },
  },
};

const moatEvaluationSchema = {
  type: "object",
  required: ["symbol", "companyName", "totalScore", "maxScore", "verdict", "criteria"],
  properties: {
    symbol: { type: "string", example: "KO" },
    companyName: { type: "string", example: "The Coca-Cola Company" },
    sector: { type: "string" },
    industry: { type: "string" },
    totalScore: { type: "number", example: 72.5 },
    maxScore: { type: "number", example: 100 },
    verdict: {
      type: "string",
      example: "Strong Durable Competitive Advantage",
    },
    criteriaCount: { type: "integer" },
    passedCount: { type: "integer" },
    criteria: { type: "array", items: criterionResultSchema },
    valuation: {
      type: "object",
      properties: {
        peRatio: { type: "number", nullable: true },
        forwardPE: { type: "number", nullable: true },
        pegRatio: { type: "number", nullable: true },
        augmentedPayoutRatio: { type: "number", nullable: true },
        sellTrigger: { type: "boolean" },
      },
    },
    _cached: { type: "boolean" },
    _cachedAt: { type: "string" },
    _evaluatedAt: { type: "string" },
  },
};

export function buildPublicOpenApiDocument() {
  const site = getPublicDocsSiteUrl();

  return {
    openapi: "3.1.0",
    info: {
      title: "trefolio Public Integration API",
      version: CURRENT_VERSION,
      description:
        "Machine-readable integration guide for LLMs and external agents. " +
        "Portfolio **read** access for agents should use MCP (`/.well-known/mcp.json`) with a user PAT. " +
        "Warren MOAT and Warren chat require a browser session (`trefolio_session` cookie). " +
        "Human-readable sections: `/api/docs`. Not financial advice.",
      contact: { name: "Trefolio", url: site, email: "hi@trefolio.com" },
    },
    servers: [{ url: site }],
    tags: [
      { name: "docs", description: "Public documentation discovery" },
      { name: "warren-moat", description: "Buffett-style MOAT evaluation (Warren)" },
      { name: "warren-chat", description: "Warren portfolio AI assistant" },
      { name: "portfolio", description: "Session-authenticated portfolio data" },
    ],
    paths: {
      "/api/docs": {
        get: {
          tags: ["docs"],
          summary: "Documentation index",
          operationId: "getDocsIndex",
          responses: {
            "200": {
              description: "Index of integration sections and discovery URLs",
            },
          },
        },
      },
      "/api/docs/{section}": {
        get: {
          tags: ["docs"],
          summary: "Documentation section",
          operationId: "getDocsSection",
          parameters: [
            {
              name: "section",
              in: "path",
              required: true,
              schema: {
                type: "string",
                enum: [
                  "overview",
                  "authentication",
                  "mcp",
                  "warren-moat",
                  "warren-chat",
                  "portfolio",
                ],
              },
            },
          ],
          responses: {
            "200": { description: "Section payload with structured integration details" },
            "404": { description: "Unknown section" },
          },
        },
      },
      "/api/stock-evaluation": {
        get: {
          tags: ["warren-moat"],
          summary: "Run Warren MOAT evaluation for a symbol",
          description:
            "Returns quantitative Buffett-framework moat scores from fundamentals. " +
            "Cached results are available to any signed-in user; `fresh=1` consumes Pro `stock_evaluation` quota.",
          operationId: "getStockMoatEvaluation",
          security: [{ sessionCookie: [] }],
          parameters: [
            {
              name: "symbol",
              in: "query",
              required: true,
              schema: { type: "string", example: "AAPL" },
            },
            {
              name: "fresh",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["1"] },
              description: "Bypass cache and fetch new fundamentals",
            },
          ],
          responses: {
            "200": {
              description: "MoatEvaluation",
              content: {
                "application/json": {
                  schema: moatEvaluationSchema,
                },
              },
            },
            "401": { description: "Not signed in" },
            "404": { description: "Insufficient fundamental data" },
            "429": { description: "Quota or rate limit exceeded" },
          },
        },
      },
      "/api/stock-evaluation/ai": {
        post: {
          tags: ["warren-moat"],
          summary: "Generate Warren AI narrative for a MOAT evaluation",
          operationId: "postStockMoatAiNarrative",
          security: [{ sessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["evaluation"],
                  properties: {
                    evaluation: moatEvaluationSchema,
                    language: { type: "string", example: "es" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Server-sent events stream of markdown narrative",
              content: { "text/event-stream": { schema: { type: "string" } } },
            },
            "401": { description: "Not signed in" },
            "429": { description: "AI quota exceeded" },
          },
        },
      },
      "/api/moat-screener": {
        get: {
          tags: ["warren-moat"],
          summary: "Screen cached MOAT evaluations",
          operationId: "getMoatScreener",
          security: [{ sessionCookie: [] }],
          parameters: [
            { name: "action", in: "query", schema: { type: "string", enum: ["meta"] } },
            { name: "scoreMin", in: "query", schema: { type: "number" } },
            { name: "scoreMax", in: "query", schema: { type: "number" } },
            { name: "verdict", in: "query", schema: { type: "string" } },
            { name: "sector", in: "query", schema: { type: "string" } },
            { name: "peMax", in: "query", schema: { type: "number" } },
            { name: "marketCapMax", in: "query", schema: { type: "number" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: {
            "200": { description: "Paginated screener results or meta" },
            "401": { description: "Not signed in" },
          },
        },
      },
      "/api/moat-reports": {
        get: {
          tags: ["warren-moat"],
          summary: "List saved MOAT reports",
          operationId: "listMoatReports",
          security: [{ sessionCookie: [] }],
          parameters: [
            {
              name: "tags",
              in: "query",
              schema: { type: "string" },
              description: "Comma-separated tag filter",
            },
          ],
          responses: {
            "200": { description: "Array of saved reports" },
            "401": { description: "Not signed in" },
          },
        },
        post: {
          tags: ["warren-moat"],
          summary: "Save a MOAT report",
          operationId: "createMoatReport",
          security: [{ sessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["symbol", "evaluationJson"],
                  properties: {
                    symbol: { type: "string" },
                    companyName: { type: "string" },
                    evaluationJson: { type: "string" },
                    totalScore: { type: "number" },
                    maxScore: { type: "number" },
                    verdict: { type: "string" },
                    tags: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Created report id" },
            "401": { description: "Not signed in" },
          },
        },
      },
      "/api/warren/chat": {
        post: {
          tags: ["warren-chat"],
          summary: "Warren portfolio AI chat turn",
          operationId: "postWarrenChat",
          security: [{ sessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["messages"],
                  properties: {
                    messages: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["role", "content"],
                        properties: {
                          role: { type: "string", enum: ["user", "assistant"] },
                          content: { type: "string", maxLength: 12000 },
                        },
                      },
                    },
                    language: { type: "string" },
                    activePortfolioId: { type: "string" },
                    baseCurrency: { type: "string", default: "EUR" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "SSE stream of Warren frames",
              content: { "text/event-stream": { schema: { type: "string" } } },
            },
            "401": { description: "Not signed in" },
            "429": { description: "AI quota exceeded" },
          },
        },
      },
      "/api/holdings": {
        get: {
          tags: ["portfolio"],
          summary: "List holdings",
          operationId: "listHoldings",
          security: [{ sessionCookie: [] }],
          responses: {
            "200": { description: "Holdings array" },
            "401": { description: "Not signed in" },
          },
        },
      },
      "/api/portfolios": {
        get: {
          tags: ["portfolio"],
          summary: "List portfolios",
          operationId: "listPortfoliosRest",
          security: [{ sessionCookie: [] }],
          responses: {
            "200": { description: "Portfolios array" },
            "401": { description: "Not signed in" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "trefolio_session",
          description: "JWT session after OIDC/password login. Not suitable for third-party server agents.",
        },
        bearerPat: {
          type: "http",
          scheme: "bearer",
          description:
            "Personal access token `tfp_pat_…` for MCP only. Mint at user.trefolio.com/account/developer.",
        },
      },
      schemas: {
        MoatEvaluation: moatEvaluationSchema,
        CriterionResult: criterionResultSchema,
      },
    },
    "x-mcp": {
      discovery: `${site}/.well-known/mcp.json`,
      endpoint: `${site}/api/mcp/user`,
      security: "bearerPat",
    },
    "x-documentation": {
      index: `${site}/api/docs`,
      warren_moat: `${site}/api/docs/warren-moat`,
    },
  };
}
