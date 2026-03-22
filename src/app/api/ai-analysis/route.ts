export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireFeatureAccess } from "@/lib/auth/guards";
import { getGlobalOpenAIApiKey, incrementAiUsage, incrementDailyAiUsage, incrementAiTokenUsage, incrementDailyAiTokenUsage, findUserById, insertAiLog, updateAiLogError } from "@/lib/db";
import { aiCallsTotal, aiRequestDuration, rateLimitHitsTotal } from "@/lib/metrics";
import { checkAiRateLimit, checkGlobalAiCap, incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { createAiStream } from "@/lib/ai-stream";
import { languageCodeToName } from "@/lib/languages";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/ai-analysis", async (request: NextRequest) => {
  const { session, error } = await requireFeatureAccess(request, "ai");
  if (error || !session) return error;

  const user = await findUserById(session.userId);
  const plan = (user?.plan || session?.plan || "free") as "free" | "starter" | "pro";
  if (plan === "pro") {
    const rl = await checkAiRateLimit(session.userId, plan, session.role);
    if (!rl.allowed) {
      rateLimitHitsTotal.inc({ provider: "openai" });
      return Response.json(
        {
          error: "Daily AI analysis limit reached",
          reason: "rate_limited",
          provider: "openai",
          limit: rl.limit,
          remaining: 0,
          retryAfter: 86400,
        },
        { status: 429, headers: { "Retry-After": "86400" } }
      );
    }
  }

  const globalCap = await checkGlobalAiCap(session.role);
  if (!globalCap.allowed) {
    return Response.json(
      { error: "Platform AI usage limit reached for this month. Please try again next month.", used: globalCap.used, cap: globalCap.cap },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  const apiKey = getGlobalOpenAIApiKey();
  if (!apiKey) {
    return Response.json(
      { error: "OpenAI API key not configured. Ask your admin to set it in the Admin panel." },
      { status: 501 }
    );
  }

  let body: {
    companyName?: string;
    ticker?: string;
    exchange?: string;
    overview?: Record<string, unknown>;
    income?: Record<string, unknown>;
    balance?: Record<string, unknown>;
    cashflow?: Record<string, unknown>;
    earnings?: Record<string, unknown>;
    language?: string;
    analysisType?: string;
    news?: Record<string, unknown>[];
    insiderTransactions?: Record<string, unknown>[];
    institutionalHoldings?: Record<string, unknown>[];
    earningsTranscript?: string;
    focusTab?: string;
    indicatorName?: string;
    indicatorData?: { date: string; value: number | null }[];
    indicatorUnit?: string;
    indicatorInterval?: string;
    cryptoSymbol?: string;
    cryptoName?: string;
    cryptoData?: Record<string, unknown>;
    historyData?: Array<Record<string, unknown>>;
    taxReport?: Record<string, unknown>;
    allocationData?: Record<string, unknown>;
    rebalancePlan?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const lang = languageCodeToName(body.language || "en");
  const companyLabel = body.companyName
    ? `${body.companyName} (${body.ticker})`
    : body.ticker || "this company";

  const dataSections: string[] = [];
  const isIntelligence = body.analysisType === "intelligence";
  const isEconomic = body.analysisType === "economic_indicator";
  const isCrypto = body.analysisType === "crypto_market";
  const isTaxAssistant = body.analysisType === "tax_assistant";
  const isRebalancing = body.analysisType === "rebalancing_assistant";

  if (isRebalancing) {
    if (body.allocationData) {
      dataSections.push(`## Portfolio Allocation & Drift\n${JSON.stringify(body.allocationData, null, 2)}`);
    }
    if (body.rebalancePlan) {
      dataSections.push(`## Proposed Rebalancing Plan\n${JSON.stringify(body.rebalancePlan, null, 2)}`);
    }
  } else if (isTaxAssistant) {
    if (body.taxReport) {
      dataSections.push(`## Tax Report\n${JSON.stringify(body.taxReport, null, 2)}`);
    }
  } else if (isCrypto) {
    if (body.cryptoData) {
      dataSections.push(
        `## ${body.cryptoName || body.cryptoSymbol || "Cryptocurrency"} (${body.cryptoSymbol || ""})\n` +
        `Current data:\n${JSON.stringify(body.cryptoData, null, 2)}`
      );
    }
    if (body.historyData && body.historyData.length > 0) {
      dataSections.push(
        `### Recent Price History (most recent first)\n` +
        body.historyData.map((d) => `${d.date}: close=${d.close}, high=${d.high}, low=${d.low}, vol=${d.volume}`).join("\n")
      );
    }
  } else if (isEconomic) {
    if (body.indicatorData && body.indicatorData.length > 0) {
      const recent = body.indicatorData.slice(0, 40);
      dataSections.push(
        `## ${body.indicatorName || "Economic Indicator"}\n` +
        `Unit: ${body.indicatorUnit || "N/A"}\n` +
        `Interval: ${body.indicatorInterval || "N/A"}\n\n` +
        `### Data (most recent first)\n` +
        recent.map((d) => `${d.date}: ${d.value ?? "N/A"}`).join("\n")
      );
    }
  } else if (!isIntelligence) {
    if (body.overview) {
      dataSections.push(`## Company Overview\n${JSON.stringify(body.overview, null, 2)}`);
    }
    if (body.income) {
      dataSections.push(`## Income Statement (latest periods)\n${JSON.stringify(body.income, null, 2)}`);
    }
    if (body.balance) {
      dataSections.push(`## Balance Sheet (latest periods)\n${JSON.stringify(body.balance, null, 2)}`);
    }
    if (body.cashflow) {
      dataSections.push(`## Cash Flow (latest periods)\n${JSON.stringify(body.cashflow, null, 2)}`);
    }
    if (body.earnings) {
      dataSections.push(`## Earnings (latest periods)\n${JSON.stringify(body.earnings, null, 2)}`);
    }
  } else {
    if (body.news && body.news.length > 0) {
      dataSections.push(`## Recent News & Sentiment\n${JSON.stringify(body.news, null, 2)}`);
    }
    if (body.insiderTransactions && body.insiderTransactions.length > 0) {
      dataSections.push(`## Insider Transactions\n${JSON.stringify(body.insiderTransactions, null, 2)}`);
    }
    if (body.institutionalHoldings && body.institutionalHoldings.length > 0) {
      dataSections.push(`## Institutional Holdings\n${JSON.stringify(body.institutionalHoldings, null, 2)}`);
    }
    if (body.earningsTranscript) {
      dataSections.push(`## Earnings Call Transcript (excerpt)\n${body.earningsTranscript}`);
    }
  }

  if (dataSections.length === 0) {
    return Response.json({ error: "No financial data provided" }, { status: 400 });
  }

  const analysisTypeLabel =
    body.analysisType === "intelligence"
      ? "intelligence"
      : body.analysisType === "economic_indicator"
        ? "economic"
        : body.analysisType === "crypto_market"
          ? "crypto"
          : body.analysisType === "tax_assistant"
            ? "tax_assistant"
            : body.analysisType === "rebalancing_assistant"
              ? "rebalancing"
              : "fundamental";

  let systemPrompt: string;
  let userPrompt: string;

  if (isRebalancing) {
    const hasPlan = !!body.rebalancePlan;

    systemPrompt = `You are an expert portfolio strategist and financial advisor who helps retail investors rebalance their portfolios.
Your audience ranges from beginners to experienced investors.

Rules:
- Write in ${lang}.
- ONLY use facts and numbers explicitly present in the data provided below. Do NOT invent holdings, prices, or market predictions.
- Structure your response with clear headings using markdown ##.
- Be actionable: tell the user exactly what to do and why.
${hasPlan
  ? `- The user has created a rebalancing plan. Evaluate it: is the distribution sensible? Are there risks? Suggest improvements.
- Start with a brief verdict: is this a good plan, needs adjustment, or has issues?
- Comment on the before/after impact — does it meaningfully reduce drift?
- Flag any tax implications (holding period, wash sale rules) if relevant.`
  : `- The user has NOT yet created a plan. Analyze their current allocation and drift.
- Start with a brief "Portfolio Health" summary — rate the current state.
- Identify the biggest risks (overexposure, concentration, correlation).
- Suggest specific rebalancing moves with amounts and priority order.
- Explain the reasoning in simple terms.`}
- Keep the total response under 600 words.
- Include a disclaimer that this is not financial advice.`;

    userPrompt = hasPlan
      ? `Here is my portfolio allocation data and a proposed rebalancing plan. Please evaluate the plan and suggest improvements.\n\n${dataSections.join("\n\n")}`
      : `Here is my current portfolio allocation and drift data. Please analyze it and suggest a rebalancing strategy.\n\n${dataSections.join("\n\n")}`;
  } else if (isCrypto) {
    const cryptoLabel = body.cryptoName
      ? `${body.cryptoName} (${body.cryptoSymbol})`
      : body.cryptoSymbol || "this cryptocurrency";

    systemPrompt = `You are a friendly cryptocurrency analyst who explains crypto market data to beginners.
Your audience has NO crypto or financial background.

Rules:
- Write in ${lang}.
- ONLY use facts and numbers explicitly present in the data provided below. Do NOT invent price targets, predictions, or historical comparisons not in the input.
- If the data is insufficient to draw a conclusion, say so clearly instead of speculating.
- Use simple, everyday language. When you must mention a crypto term, explain it briefly in parentheses.
- Structure your response with clear headings using markdown ##.
- Start with a one-sentence "Quick Take" — is the trend bullish, bearish, or sideways?
- Analyze the price trend, volume patterns, and volatility from the data.
- Mention any notable support/resistance levels visible in the data.
- Keep the total response under 500 words.
- Include a disclaimer that this is not financial advice.`;

    userPrompt = `Here is market data for ${cryptoLabel}.
Please analyze the trends and explain what they mean in simple terms.

${dataSections.join("\n\n")}`;
  } else if (isEconomic) {
    systemPrompt = `You are a friendly economist who explains macroeconomic data to beginners.
Your audience has NO economics or finance background.

Rules:
- Write in ${lang}.
- ONLY use facts and numbers explicitly present in the data provided below. Do NOT invent statistics, comparisons, or historical context that are not in the input.
- If the data is insufficient to draw a conclusion, say so clearly instead of speculating.
- Use simple, everyday language. When you must mention an economic term, explain it briefly in parentheses.
- Structure your response with clear headings using markdown ##.
- Start with a one-sentence "Quick Take" — is the trend positive, negative, or stable?
- Explain what the indicator measures and why it matters for ordinary people (jobs, prices, savings, etc.).
- Describe the trend you see in the data — is it going up, down, or sideways? Any notable turning points?
- If relevant, mention how the current level compares to historical norms only if norms are inferable from the provided data range.
- Keep the total response under 500 words.
- Be honest — if the data looks concerning, say so diplomatically.`;

    userPrompt = `Here is recent data for a US economic indicator.
Please analyze the trend and explain what it means in simple terms.

${dataSections.join("\n\n")}`;
  } else if (isIntelligence) {
    const focusMap: Record<string, string> = {
      news: "news sentiment and what the media narrative means for the stock",
      insider: "insider transactions — are executives buying or selling and what does that signal",
      institutional: "institutional ownership — who the big investors are and what their positions suggest",
      transcript: "the earnings call transcript — key takeaways, management tone, and forward outlook",
    };
    const focusHint = body.focusTab ? focusMap[body.focusTab] || "" : "";

    systemPrompt = `You are a friendly market intelligence analyst who explains stock market signals to beginners.
Your audience has NO financial background.

Rules:
- Write in ${lang}.
- ONLY reference information explicitly present in the data provided below. Do NOT fabricate news headlines, insider names, institutional holders, or any details not in the input.
- If the data is insufficient or signals are ambiguous, say so clearly instead of speculating.
- Use simple, everyday language. When you must mention a market term, explain it briefly in parentheses.
- Structure your response with clear headings using markdown ##.
- Start with a brief "Signal Summary" — one or two sentences on what the data suggests overall (bullish, bearish, or mixed).
- ${focusHint ? `Focus especially on ${focusHint}.` : "Cover all available data sections."}
- Explain what patterns you see and why they might matter for the stock price.
- Highlight notable red flags or positive signals.
- Keep the total response under 600 words.
- Be honest — if signals are mixed or unclear, say so.`;

    userPrompt = `Here is market intelligence data for ${companyLabel} (exchange: ${body.exchange || "unknown"}).
Please analyze it and explain what these signals mean in simple terms.

${dataSections.join("\n\n")}`;
  } else if (isTaxAssistant) {
    systemPrompt = `You are a knowledgeable European tax advisor assistant. You help retail investors understand their tax reports. You speak clearly and concisely, avoiding jargon where possible. When you must use technical terms (like Vorabpauschale, Teilfreistellung, PFU, Box 3), explain them briefly in parentheses. You NEVER give definitive tax advice — always recommend consulting a professional tax advisor. You identify potential issues, optimizations, and missing data.

Rules:
- Write in ${lang}.
- ONLY use facts and figures explicitly present in the tax report data provided below. Do NOT invent numbers or rules.
- Structure your response with clear headings using markdown ##.
- Cover: key findings summary, data quality issues, potential optimizations (tax-loss harvesting, allowance usage, withholding tax recovery), country-specific rules that apply, and any required filings (Modelo 720, Quadro RW, etc.).
- Keep the total response under 700 words.
- Always end with a disclaimer that this is not tax advice and the user should consult a professional.`;

    userPrompt = `Here is a tax report for a retail investor. Please analyze it and provide helpful guidance.

${dataSections.join("\n\n")}

Please:
1. Summarize the key findings (realized gains/losses, dividends, estimated tax).
2. Flag any data quality issues or missing data.
3. Suggest potential optimizations (tax-loss harvesting, allowance usage, withholding tax recovery).
4. Explain country-specific rules that apply to this report.
5. Note any required filings (e.g. Modelo 720, Quadro RW) and thresholds.`;
  } else {
    systemPrompt = `You are a friendly financial analyst who explains company financials to beginners. 
Your audience has NO financial background — they don't know what P/E ratio, EBITDA, or cash flow means.

Rules:
- Write in ${lang}.
- ONLY use facts, numbers, and metrics explicitly present in the data provided below. Do NOT invent figures, price targets, analyst opinions, or historical comparisons that are not in the input.
- If data for a topic (e.g., analyst sentiment, company description) is not provided, skip it or note its absence instead of guessing.
- Use simple, everyday language. When you must mention a financial term, explain it with a short analogy or everyday comparison in parentheses.
- Structure your response with clear headings using markdown ##.
- Include a brief "Health Score" summary at the top — rate the company's overall financial health as one of: Strong, Good, Fair, Weak, or Concerning, with a one-sentence justification based solely on the provided numbers.
- Cover: profitability, growth trends, financial strength (debt vs cash), and analyst sentiment if available in the data.
- Highlight key risks and strengths in a final section.
- Keep the total response under 600 words.
- Be honest — if numbers look bad, say so diplomatically.`;

    userPrompt = `Here is the financial data for ${companyLabel} (exchange: ${body.exchange || "unknown"}).
Please analyze it and explain what these numbers mean in simple terms.

${dataSections.join("\n\n")}`;
  }

  const endTimer = aiRequestDuration.startTimer({ analysis_type: analysisTypeLabel });
  const aiLogStart = Date.now();

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: 1200,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    endTimer();
    const durationMs = Date.now() - aiLogStart;

    if (!openaiRes.ok) {
      aiCallsTotal.inc({ status: "error", analysis_type: analysisTypeLabel });
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      insertAiLog({ userId: session.userId, source: analysisTypeLabel, model: "gpt-4o-mini", promptSystem: systemPrompt, promptUser: userPrompt, durationMs, status: "error", errorMessage: errText.slice(0, 2000) }).catch(() => {});
      return Response.json(
        { error: "AI service returned an error. Check your API key and quota." },
        { status: 502 }
      );
    }

    aiCallsTotal.inc({ status: "success", analysis_type: analysisTypeLabel });
    const logId = await insertAiLog({ userId: session.userId, source: analysisTypeLabel, model: "gpt-4o-mini", promptSystem: systemPrompt, promptUser: userPrompt, durationMs }).catch(() => "");
    await Promise.all([
      incrementAiUsage(session.userId),
      incrementDailyAiUsage(session.userId),
      incrementGlobalAiCalls(),
    ]);

    const stream = createAiStream(openaiRes.body, {
      aiLogId: logId || undefined,
      aiLogModel: "gpt-4o-mini",
      onComplete: async (tokens) => {
        await Promise.all([
          incrementAiTokenUsage(session.userId, tokens),
          incrementDailyAiTokenUsage(session.userId, tokens),
          incrementGlobalAiTokens(tokens),
        ]);
      },
      fallbackTokenEstimate: 1200 + 2500,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("AI analysis error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to contact AI service" }, { status: 500 });
  }
});
