export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requirePro } from "@/lib/auth/guards";
import {
  getGlobalOpenAIApiKey,
  listHoldings,
  listCashEntries,
  getPortfolioReviewUsage,
  incrementPortfolioReviewUsage,
  trackEvent,
} from "@/lib/db";
import { PLATFORM_LIMITS } from "@/lib/platform-config";
import { checkGlobalAiCap, incrementGlobalAiCalls } from "@/lib/rate-limit";
import { aiCallsTotal, aiRequestDuration } from "@/lib/metrics";
import { languageCodeToName } from "@/lib/languages";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/portfolio-review", async (request: NextRequest) => {
  const { session, error } = await requirePro(request);
  if (error || !session) return error;

  const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  const usage = await getPortfolioReviewUsage(session.userId);
  const limit = PLATFORM_LIMITS.PORTFOLIO_REVIEW_MONTHLY_LIMIT;
  if (!isDev && usage.count >= limit) {
    trackEvent(session.userId, "portfolio_review_limit_reached", { used: String(usage.count), limit: String(limit) });
    return Response.json(
      {
        error: "Monthly portfolio review limit reached",
        reason: "review_limit_reached",
        limit,
        used: usage.count,
      },
      { status: 429 }
    );
  }

  const globalCap = await checkGlobalAiCap();
  if (!globalCap.allowed) {
    return Response.json(
      { error: "Platform AI usage limit reached for this month. Please try again next month." },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  const apiKey = await getGlobalOpenAIApiKey();
  if (!apiKey) {
    return Response.json(
      { error: "OpenAI API key not configured. Ask your admin to set it in the Admin panel." },
      { status: 501 }
    );
  }

  let body: { language?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const holdings = await listHoldings(session.userId);
  const cashEntries = await listCashEntries(session.userId);

  if (holdings.length === 0 && cashEntries.length === 0) {
    return Response.json({ error: "No holdings or cash to review" }, { status: 400 });
  }

  const lang = languageCodeToName(body.language || "en");

  const holdingsSummary = holdings.map((h) => ({
    name: h.name,
    ticker: h.ticker,
    type: h.assetType || "stock",
    shares: h.shares,
    avgCost: h.purchasePrice,
    currency: h.displayCurrency,
    exchange: h.exchange,
    sector: h.sector || "Unknown",
    region: h.region || "Unknown",
    assetClass: h.assetClass || "Unknown",
  }));

  const cashSummary = cashEntries.map((c) => ({
    name: c.name,
    amountEUR: c.amountEUR,
  }));

  const totalCostEUR = holdings.reduce((sum, h) => sum + h.shares * h.purchasePrice, 0);
  const totalCashEUR = cashEntries.reduce((sum, c) => sum + c.amountEUR, 0);

  const portfolioData = `## Portfolio Holdings (${holdings.length} positions)
${JSON.stringify(holdingsSummary, null, 2)}

## Cash Positions (${cashEntries.length} entries, total ~€${totalCashEUR.toFixed(2)})
${JSON.stringify(cashSummary, null, 2)}

## Summary
- Total positions: ${holdings.length}
- Total cost basis: ~€${totalCostEUR.toFixed(2)}
- Total cash: ~€${totalCashEUR.toFixed(2)}`;

  const systemPrompt = `You are a friendly, expert portfolio advisor who explains investment portfolios to beginners.
Your audience has NO financial background — they don't understand terms like "alpha", "Sharpe ratio", or "correlation" without explanation.

Rules:
- Write in ${lang}.
- ONLY analyze the data provided below. Do NOT invent prices, returns, benchmarks, or market data that is not in the input.
- Use simple, everyday language. When you must use a financial term, explain it briefly in parentheses.
- Structure your response with clear headings using markdown ##.
- Start with a brief "Portfolio Health" summary — rate the portfolio as one of: Excellent, Good, Fair, Needs Attention, or Risky, with a one-sentence justification.
- Cover these areas:
  1. **Diversification** — Is the portfolio spread across enough sectors, regions, and asset types? Flag any single position that dominates.
  2. **Concentration Risk** — Are there positions that are too large relative to the total? (Guideline: any single stock > 20% of total is risky)
  3. **Balance** — How does the mix of stocks vs ETFs vs cash look? Is there a healthy emergency reserve?
  4. **Strengths** — What is the portfolio doing well?
  5. **Recommendations** — Give 3-5 specific, actionable suggestions for improvement. Be concrete (e.g., "Consider adding an emerging markets ETF" not just "diversify more").
- Keep the total response under 800 words.
- Be honest but encouraging — if the portfolio needs work, say so diplomatically.
- End with a brief disclaimer that this is AI-generated analysis and not personalized financial advice.`;

  const userPrompt = `Here is my investment portfolio. Please review it and give me feedback and recommendations.

${portfolioData}`;

  trackEvent(session.userId, "portfolio_review_requested", {
    holdingsCount: String(holdings.length),
    cashCount: String(cashEntries.length),
  });

  const endTimer = aiRequestDuration.startTimer({ analysis_type: "portfolio_review" });

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
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    endTimer();

    if (!openaiRes.ok) {
      aiCallsTotal.inc({ status: "error", analysis_type: "portfolio_review" });
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      return Response.json(
        { error: "AI service returned an error. Check your API key and quota." },
        { status: 502 }
      );
    }

    aiCallsTotal.inc({ status: "success", analysis_type: "portfolio_review" });
    await Promise.all([
      incrementPortfolioReviewUsage(session.userId),
      incrementGlobalAiCalls(),
    ]);
    trackEvent(session.userId, "portfolio_review_completed", {
      holdingsCount: String(holdings.length),
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiRes.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("Portfolio review error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to contact AI service" }, { status: 500 });
  }
});
