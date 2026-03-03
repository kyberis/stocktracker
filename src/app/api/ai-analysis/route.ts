export const dynamic = "force-dynamic";
export const runtime = "edge";

function getOpenAIKey(): string | undefined {
  return (
    process.env.STOCKTRACKER_OPENAI_API_KEY ||
    process.env.stocktracker_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY
  );
}

export async function POST(request: Request) {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return Response.json(
      { error: "OpenAI API key not configured. Set STOCKTRACKER_OPENAI_API_KEY." },
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
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const lang = body.language === "es" ? "Spanish" : "English";
  const companyLabel = body.companyName
    ? `${body.companyName} (${body.ticker})`
    : body.ticker || "this company";

  const dataSections: string[] = [];

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

  if (dataSections.length === 0) {
    return Response.json({ error: "No financial data provided" }, { status: 400 });
  }

  const systemPrompt = `You are a friendly financial analyst who explains company financials to beginners. 
Your audience has NO financial background — they don't know what P/E ratio, EBITDA, or cash flow means.

Rules:
- Write in ${lang}.
- Use simple, everyday language. When you must mention a financial term, explain it with a short analogy or everyday comparison in parentheses.
- Structure your response with clear headings using markdown ##.
- Include a brief "Health Score" summary at the top — rate the company's overall financial health as one of: Strong, Good, Fair, Weak, or Concerning, with a one-sentence justification.
- Cover: what the company does, profitability, growth trends, financial strength (debt vs cash), and analyst sentiment if available.
- Highlight key risks and strengths in a final section.
- Keep the total response under 600 words.
- Be honest — if numbers look bad, say so diplomatically.`;

  const userPrompt = `Here is the financial data for ${companyLabel} (exchange: ${body.exchange || "unknown"}).
Please analyze it and explain what these numbers mean in simple terms.

${dataSections.join("\n\n")}`;

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
        max_tokens: 1200,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      return Response.json(
        { error: "AI service returned an error. Check your API key and quota." },
        { status: 502 }
      );
    }

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
                // Skip malformed chunks
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
    console.error("AI analysis error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to contact AI service" }, { status: 500 });
  }
}
