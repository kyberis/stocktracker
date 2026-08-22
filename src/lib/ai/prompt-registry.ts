import type { AiFlowKey } from "@/lib/ai-models";
import { AI_FLOW_META } from "@/lib/ai-models";
import { HOLDING_CLASSIFICATION_SYSTEM_PROMPT } from "@/lib/ai-classify-holding";
import { buildWarrenSystemPrompt } from "@/lib/ai/warren/system-prompt";
import { buildSupportSystemPrompt } from "@/lib/support-knowledge";
import { buildScorePrompt } from "@/lib/portfolio-score";
import {
  extractAssignmentTemplateLiteral,
  extractConstTemplateLiteral,
  previewTemplate,
} from "@/lib/ai/extract-source-prompt";
import { buildIntakePrompt } from "@/lib/screening/prompts/intake";
import { buildHardDataPrompt } from "@/lib/screening/prompts/hard-data";
import { buildIrBusinessPrompt } from "@/lib/screening/prompts/ir-business";
import { buildWebSentimentPrompt } from "@/lib/screening/prompts/web-sentiment";
import { buildPortfolioContextPrompt } from "@/lib/screening/prompts/portfolio-context";
import { buildRiskPrompt } from "@/lib/screening/prompts/risk";
import { buildCompilerPrompt } from "@/lib/screening/prompts/compiler";
import { buildCompilerEvaluatePrompt } from "@/lib/screening/prompts/compiler-evaluate";
import { buildQaQualitativePrompt } from "@/lib/screening/prompts/qa-qualitative";
import type { ScreeningBrief, ScreeningReport } from "@/lib/screening/schemas";
import {
  CLARA_PROMPT_EN_SNAPSHOT,
  previewWillEnPrompt,
} from "@/lib/ai/external-agent-prompts";

export type PromptGroupId =
  | "warren"
  | "office"
  | "screening"
  | "portfolio"
  | "analysis"
  | "support"
  | "digest"
  | "import"
  | "external";

export const PROMPT_GROUPS: { id: PromptGroupId; label: string }[] = [
  { id: "warren", label: "Warren" },
  { id: "office", label: "Agent Office" },
  { id: "screening", label: "Screening pipeline" },
  { id: "portfolio", label: "Portfolio tools" },
  { id: "analysis", label: "AI analysis" },
  { id: "support", label: "Support" },
  { id: "digest", label: "Digests" },
  { id: "import", label: "Import" },
  { id: "external", label: "Sister agents" },
];

export interface AiPromptEntry {
  id: string;
  group: PromptGroupId;
  agent?: "warren" | "clara" | "will";
  label: string;
  description: string;
  sourceFile: string;
  flowKey?: AiFlowKey;
  systemPrompt: string;
  userPrompt?: string;
  notes?: string;
  isSample?: boolean;
}

const SAMPLE_BRIEF: ScreeningBrief = {
  intent: "explore",
  includeSectors: ["Technology"],
  excludeSectors: [],
  regions: ["europe"],
  candidateCount: 5,
  criteria: [
    { key: "marketCap", condition: "300 – 15,000M USD", source: "preset" },
    { key: "fwdPe", condition: "< 15x", source: "preset" },
    { key: "roic", condition: "> 12%", source: "preset" },
  ],
  endedEarly: false,
  locale: "es",
  riskProfile: "balanced",
};

const SAMPLE_TICKERS = ["SAP.DE", "ASML.AS", "NOVO-B.CO"];

function routePrompt(
  file: string,
  marker: string,
  occurrence = 0,
): string {
  return (
    extractAssignmentTemplateLiteral(file, marker, occurrence) ??
    "(prompt not found in source — check file path)"
  );
}

function flowDescription(key: AiFlowKey): string {
  return AI_FLOW_META[key]?.description ?? "";
}

function warrenPromptEntry(): AiPromptEntry {
  return {
    id: "warren",
    group: "warren",
    agent: "warren",
    label: "Warren · System prompt",
    description:
      "Single Warren persona for web drawer, Telegram, and Agent Office. Only delivery rules (length, cards, disclaimer) change via the channel option.",
    sourceFile: "src/lib/ai/warren/system-prompt.ts",
    flowKey: "portfolio_chat",
    systemPrompt: buildWarrenSystemPrompt({
      language: "es",
      userName: "María",
      baseCurrency: "EUR",
      activePortfolioName: "Mi cartera",
      activePortfolioId: "demo-portfolio",
      channel: "web",
      subscriptionPlan: "pro",
    }),
    isSample: true,
    notes:
      "Set channel to web | telegram | office for delivery deltas. Legacy streaming /api/portfolio/ai-chat uses the same prompt with textOnlyStream: true and an inlined portfolio snapshot.",
  };
}

function screeningPrompts(): AiPromptEntry[] {
  const hardData = {
    status: "ok" as const,
    universeSize: 240,
    candidates: SAMPLE_TICKERS.map((ticker, i) => ({
      ticker,
      name: `Sample ${ticker}`,
      sector: "Technology",
      industry: null,
      country: "DE",
      marketCapUsd: 12_000,
      price: 100 + i,
      rankScore: 90 - i * 5,
      rankReason: "Sample rank reason for admin preview.",
    })),
    deferredTickers: [],
    gaps: [],
    locale: "es",
    sources: [],
  };

  const compilerDraft = {
    summary: "Sample screening summary for admin preview.",
    candidateBullets: SAMPLE_TICKERS.map((ticker) => ({
      ticker,
      headline: `${ticker} headline`,
      bullet: "Sample thesis bullet for admin preview.",
    })),
    disclaimer: "Educational research only — not financial advice.",
    locale: "es",
  };

  const qaReport: ScreeningReport = {
    jobId: "admin-preview",
    mode: "user_report",
    locale: "es",
    generatedAt: "2026-08-22T12:00:00.000Z",
    methodologyNote: "trefolio screening methodology (sample)",
    executiveSummary: "Sample report summary for admin preview.",
    priorityOrder: SAMPLE_TICKERS,
    comparisonRows: [],
    cards: [],
    disclaimer: "Educational research only — not financial advice.",
    partial: false,
    pendingAgentKinds: [],
    verification: {
      verdict: "pass",
      roundNumber: 1,
      issueCount: 0,
      blockingIssueCount: 0,
      degradedTickers: [],
    },
  };

  return [
    {
      id: "screening-intake",
      group: "screening",
      label: "Screening · Intake",
      description: flowDescription("screening_intake"),
      sourceFile: "src/lib/screening/prompts/intake.ts",
      flowKey: "screening_intake",
      systemPrompt: buildIntakePrompt({
        intent: "explore",
        locale: "es",
        suggestedInclude: [],
        suggestedExclude: [],
      }),
    },
    {
      id: "screening-hard-data",
      group: "screening",
      label: "Screening · Hard Data",
      description: flowDescription("screening_hard_data"),
      sourceFile: "src/lib/screening/prompts/hard-data.ts",
      flowKey: "screening_hard_data",
      systemPrompt: buildHardDataPrompt({
        brief: SAMPLE_BRIEF,
        locale: "es",
        universeSize: 240,
        researchCount: 20,
      }),
      isSample: true,
    },
    {
      id: "screening-ir-business",
      group: "screening",
      label: "Screening · IR & Business",
      description: flowDescription("screening_ir_business"),
      sourceFile: "src/lib/screening/prompts/ir-business.ts",
      flowKey: "screening_ir_business",
      systemPrompt: buildIrBusinessPrompt({
        brief: SAMPLE_BRIEF,
        ticker: "SAP.DE",
        locale: "es",
        hardDataSummary: hardData.candidates[0] ?? null,
      }),
      isSample: true,
    },
    {
      id: "screening-web-sentiment",
      group: "screening",
      label: "Screening · Web Sentiment",
      description: flowDescription("screening_web_sentiment"),
      sourceFile: "src/lib/screening/prompts/web-sentiment.ts",
      flowKey: "screening_web_sentiment",
      systemPrompt: buildWebSentimentPrompt({
        brief: SAMPLE_BRIEF,
        ticker: "SAP.DE",
        locale: "es",
        hardDataSummary: hardData.candidates[0] ?? null,
      }),
      isSample: true,
    },
    {
      id: "screening-portfolio-context",
      group: "screening",
      label: "Screening · Portfolio Context",
      description: flowDescription("screening_portfolio_context"),
      sourceFile: "src/lib/screening/prompts/portfolio-context.ts",
      flowKey: "screening_portfolio_context",
      systemPrompt: buildPortfolioContextPrompt({
        brief: SAMPLE_BRIEF,
        locale: "es",
        candidateTickers: SAMPLE_TICKERS,
      }),
      isSample: true,
    },
    {
      id: "screening-risk",
      group: "screening",
      label: "Screening · Risk",
      description: flowDescription("screening_risk"),
      sourceFile: "src/lib/screening/prompts/risk.ts",
      flowKey: "screening_risk",
      systemPrompt: buildRiskPrompt({
        brief: SAMPLE_BRIEF,
        locale: "es",
        riskProfile: "balanced",
        assumedProfile: false,
        candidateTickers: SAMPLE_TICKERS,
      }),
      isSample: true,
    },
    {
      id: "screening-compiler",
      group: "screening",
      label: "Screening · Compiler",
      description: flowDescription("screening_compiler"),
      sourceFile: "src/lib/screening/prompts/compiler.ts",
      flowKey: "screening_compiler",
      systemPrompt: buildCompilerPrompt({
        brief: SAMPLE_BRIEF,
        hardData,
        locale: "es",
      }),
      isSample: true,
    },
    {
      id: "screening-compiler-evaluate",
      group: "screening",
      label: "Screening · Compiler Evaluate",
      description: flowDescription("screening_compiler_evaluate"),
      sourceFile: "src/lib/screening/prompts/compiler-evaluate.ts",
      flowKey: "screening_compiler_evaluate",
      systemPrompt: buildCompilerEvaluatePrompt({
        brief: SAMPLE_BRIEF,
        hardData,
        draft: compilerDraft,
        locale: "es",
      }),
      isSample: true,
    },
    {
      id: "screening-qa",
      group: "screening",
      label: "Screening · QA",
      description: flowDescription("screening_qa"),
      sourceFile: "src/lib/screening/prompts/qa-qualitative.ts",
      flowKey: "screening_qa",
      systemPrompt: buildQaQualitativePrompt({
        report: qaReport,
        layerAIssues: [],
        rawContext: "(sample raw agent context for admin preview)",
        locale: "es",
        evaluationDate: "2026-08-22",
      }),
      isSample: true,
    },
  ];
}

function analysisPrompts(): AiPromptEntry[] {
  const aiRoute = "src/app/api/ai-analysis/route.ts";
  const variants: Array<{
    id: string;
    label: string;
    marker: string;
    occurrence: number;
    userMarker?: string;
    userOccurrence?: number;
  }> = [
    { id: "analysis-suggest-targets", label: "Suggest targets", marker: "systemPrompt =", occurrence: 0 },
    { id: "analysis-rebalancing", label: "Rebalancing", marker: "systemPrompt =", occurrence: 1 },
    { id: "analysis-crypto", label: "Crypto market", marker: "systemPrompt =", occurrence: 2 },
    { id: "analysis-economic", label: "Economic indicator", marker: "systemPrompt =", occurrence: 3 },
    { id: "analysis-intelligence", label: "Market intelligence", marker: "systemPrompt =", occurrence: 4 },
    { id: "analysis-tax", label: "Tax assistant", marker: "systemPrompt =", occurrence: 5 },
    { id: "analysis-fundamental", label: "Fundamentals", marker: "systemPrompt =", occurrence: 6 },
  ];

  return variants.map((v) => {
    const system = previewTemplate(routePrompt(aiRoute, v.marker, v.occurrence));
    return {
      id: v.id,
      group: "analysis" as const,
      label: `AI Analysis · ${v.label}`,
      description: flowDescription("ai_analysis"),
      sourceFile: aiRoute,
      flowKey: "ai_analysis" as const,
      systemPrompt: system,
      notes: "Template variables (${lang}, etc.) replaced with sample values.",
      isSample: true,
    };
  });
}

function externalAgentPrompts(): AiPromptEntry[] {
  return [
    {
      id: "clara-main",
      group: "external",
      agent: "clara",
      label: "Clara · Main agent (EN)",
      description: "Personal finance assistant — lives in external/etracker",
      sourceFile: "external/etracker/src/lib/ai/run-expense-agent.ts",
      systemPrompt: CLARA_PROMPT_EN_SNAPSHOT,
      notes:
        "Vendored snapshot (npm run prompts:sync-external). Runtime prompt varies by locale, guest-event scope, and setup state; may include unresolved template placeholders from the Clara source.",
      isSample: true,
    },
    {
      id: "will-main-en",
      group: "external",
      agent: "will",
      label: "Will · Main agent (EN)",
      description: "Investing notes journal — lives in external/notetaker",
      sourceFile: "external/notetaker/src/lib/ai/prompts/en.ts",
      systemPrompt: previewWillEnPrompt(),
      notes:
        "Vendored snapshot (npm run prompts:sync-external). Will also has es / pt / ar prompts in the same folder.",
      isSample: true,
    },
  ];
}

/** Canonical catalog of platform AI system prompts for admin reference. */
export function listAiPromptCatalog(): AiPromptEntry[] {
  const score = buildScorePrompt(
    {
      holdingsCount: 12,
      totalValueEUR: 52_400,
      totalCostEUR: 48_000,
      totalGainLossPct: 9.2,
      dayChangePct: 0.4,
      cashAllocationPct: 8,
      holdings: [],
      sectorAllocation: [
        { label: "Technology", pct: 42 },
        { label: "Healthcare", pct: 18 },
      ],
      regionAllocation: [{ label: "Europe", pct: 55 }],
      typeAllocation: [{ label: "Equity", pct: 92 }],
      dividends: { estimatedAnnualEUR: 820, portfolioYield: 1.6, payingCount: 8 },
      concentrationMetrics: {
        top1WeightPct: 14,
        top5WeightPct: 48,
        herfindahlIndex: 0.12,
        positionCount: 12,
      },
    },
    "English",
  );

  return [
    warrenPromptEntry(),
    {
      id: "warren-moat-narrative",
      group: "warren",
      agent: "warren",
      label: "Warren · Moat narrative",
      description: "Narrative assessment for moat / stock evaluation",
      sourceFile: "src/lib/services/warren-moat.ts",
      systemPrompt: previewTemplate(
        routePrompt("src/lib/services/warren-moat.ts", "const systemPrompt ="),
      ),
      userPrompt: previewTemplate(
        "Here is the complete Buffett-framework evaluation for ${companyName} (${symbol}).\n\n## Quantitative Evaluation Results\n{evaluation JSON}\n\nPlease provide your narrative assessment based on this data.",
      ),
      isSample: true,
    },
    ...screeningPrompts(),
    {
      id: "chart-chat",
      group: "portfolio",
      label: "Chart chat",
      description: flowDescription("chart_chat"),
      sourceFile: "src/app/api/portfolio/chart-chat/route.ts",
      flowKey: "chart_chat",
      systemPrompt: previewTemplate(
        routePrompt("src/app/api/portfolio/chart-chat/route.ts", "const systemPrompt ="),
      ),
      isSample: true,
    },
    {
      id: "portfolio-review",
      group: "portfolio",
      label: "Portfolio review",
      description: flowDescription("portfolio_review"),
      sourceFile: "src/app/api/portfolio-review/route.ts",
      flowKey: "portfolio_review",
      systemPrompt: previewTemplate(
        routePrompt("src/app/api/portfolio-review/route.ts", "const systemPrompt ="),
      ),
      isSample: true,
    },
    {
      id: "portfolio-score",
      group: "portfolio",
      label: "Portfolio score",
      description: flowDescription("portfolio_score"),
      sourceFile: "src/lib/portfolio-score.ts",
      flowKey: "portfolio_score",
      systemPrompt: score.system,
      userPrompt: score.user,
      isSample: true,
    },
    {
      id: "company-analysis-narrative",
      group: "portfolio",
      label: "Company analysis narrative",
      description: "Structured company narrative for the analysis page",
      sourceFile: "src/app/api/company-analysis/narrative/route.ts",
      systemPrompt: previewTemplate(
        routePrompt(
          "src/app/api/company-analysis/narrative/route.ts",
          "const systemPrompt =",
        ),
      ),
      isSample: true,
    },
    {
      id: "stock-evaluation-moat",
      group: "portfolio",
      label: "Stock evaluation (moat)",
      description: "Moat evaluation narrative on the stock evaluation page",
      sourceFile: "src/app/api/stock-evaluation/ai/route.ts",
      systemPrompt: previewTemplate(
        routePrompt("src/app/api/stock-evaluation/ai/route.ts", "const systemPrompt ="),
      ),
      isSample: true,
    },
    ...analysisPrompts(),
    {
      id: "support-chat",
      group: "support",
      label: "Support chat",
      description: flowDescription("support_chat"),
      sourceFile: "src/lib/support-knowledge.ts",
      flowKey: "support_chat",
      systemPrompt: buildSupportSystemPrompt("Spanish", "", {
        holdingsCount: 8,
        totalValue: 42_500,
        currency: "EUR",
        plan: "Folio",
      }),
      notes:
        "Admin custom instructions from Settings are appended at runtime when configured.",
      isSample: true,
    },
    {
      id: "weekly-digest",
      group: "digest",
      label: "Weekly digest",
      description: flowDescription("weekly_digest"),
      sourceFile: "src/app/api/cron/weekly-digest/route.ts",
      flowKey: "weekly_digest",
      systemPrompt: previewTemplate(
        routePrompt("src/app/api/cron/weekly-digest/route.ts", "const systemPrompt ="),
      ),
      isSample: true,
    },
    {
      id: "weekly-digest-admin",
      group: "digest",
      label: "Weekly digest (admin trigger)",
      description: flowDescription("weekly_digest_admin"),
      sourceFile: "src/app/api/admin/weekly-digest/route.ts",
      flowKey: "weekly_digest_admin",
      systemPrompt: previewTemplate(
        routePrompt("src/app/api/admin/weekly-digest/route.ts", "const systemPrompt ="),
      ),
      isSample: true,
    },
    {
      id: "digest-email-rewrite",
      group: "digest",
      label: "Market digest · Rewrite",
      description: "Newsletter rewrite step",
      sourceFile: "src/lib/digest-generation.ts",
      flowKey: "digest_email",
      systemPrompt:
        extractConstTemplateLiteral(
          "src/lib/digest-generation.ts",
          "REWRITE_SYSTEM_PROMPT",
        ) ?? "(not found)",
    },
    {
      id: "digest-email-translate",
      group: "digest",
      label: "Market digest · Translate",
      description: "Newsletter translation step",
      sourceFile: "src/lib/digest-generation.ts",
      flowKey: "digest_email",
      systemPrompt:
        extractConstTemplateLiteral(
          "src/lib/digest-generation.ts",
          "TRANSLATE_SYSTEM_PROMPT",
        ) ?? "(not found)",
    },
    {
      id: "digest-x-post",
      group: "digest",
      label: "Digest X post",
      description: flowDescription("digest_x_post"),
      sourceFile: "src/lib/digest-to-tweet.ts",
      flowKey: "digest_x_post",
      systemPrompt:
        extractConstTemplateLiteral("src/lib/digest-to-tweet.ts", "SYSTEM_PROMPT") ??
        "(not found)",
    },
    {
      id: "news-article-summary",
      group: "digest",
      label: "News article summary",
      description: flowDescription("news_article_summary"),
      sourceFile: "src/app/api/news-article-summary/route.ts",
      flowKey: "news_article_summary",
      systemPrompt: previewTemplate(
        routePrompt("src/app/api/news-article-summary/route.ts", "const systemPrompt ="),
      ),
      isSample: true,
    },
    {
      id: "device-summary",
      group: "portfolio",
      label: "Device summary",
      description: flowDescription("device_summary"),
      sourceFile: "src/app/api/device/ai-summary/route.ts",
      flowKey: "device_summary",
      systemPrompt: previewTemplate(
        routePrompt("src/app/api/device/ai-summary/route.ts", "const systemPrompt ="),
      ),
      isSample: true,
    },
    {
      id: "holding-classification",
      group: "import",
      label: "Holding classification",
      description: flowDescription("holding_classification"),
      sourceFile: "src/lib/ai-classify-holding.ts",
      flowKey: "holding_classification",
      systemPrompt: HOLDING_CLASSIFICATION_SYSTEM_PROMPT,
      userPrompt:
        "Ticker: AAPL\nName: Apple Inc.\nExchange: NASDAQ\nClassify this holding.",
      isSample: true,
    },
    {
      id: "import-portfolio",
      group: "import",
      label: "Import parsing",
      description: flowDescription("import_portfolio"),
      sourceFile: "src/app/api/import-portfolio/route.ts",
      flowKey: "import_portfolio",
      systemPrompt:
        extractConstTemplateLiteral(
          "src/app/api/import-portfolio/route.ts",
          "EXTRACTION_PROMPT",
        ) ?? "(not found)",
    },
    ...externalAgentPrompts(),
  ];
}

export function getAiPromptById(id: string): AiPromptEntry | undefined {
  return listAiPromptCatalog().find((entry) => entry.id === id);
}
