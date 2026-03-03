import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { trackEvent } from "@/lib/db";

function getOpenAIKey(): string | undefined {
  return (
    process.env.STOCKTRACKER_OPENAI_API_KEY ||
    process.env.stocktracker_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY
  );
}

const EXTRACTION_PROMPT = `You are a portfolio data extractor. Analyze the provided data and extract stock/ETF holdings.

Return a JSON array of objects with these exact fields:
- name: string (company/ETF name)
- ticker: string (stock ticker symbol, e.g. AAPL, MSFT, AMZN)
- shares: number (quantity held)
- purchasePrice: number (average cost per share)
- displayCurrency: string (currency code, e.g. USD, EUR, GBP)
- exchange: string (stock exchange, e.g. NYSE, NASDAQ, XETRA, LSE, MAD)
- assetType: "stock" | "etf"

Rules:
- Extract ALL rows/entries you can identify as holdings.
- For the ticker, use the standard symbol (e.g. AAPL not Apple Inc).
- If the exchange is not clear, infer it from the ticker suffix or market context.
- If the currency is not explicit, infer it from the exchange (NYSE/NASDAQ -> USD, LSE -> GBP, XETRA -> EUR, etc.).
- If purchase price is missing, use 0.
- If shares count is missing, use 0.
- Return ONLY the JSON array, no markdown, no explanation.
- If you cannot extract any holdings, return an empty array [].`;

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Set STOCKTRACKER_OPENAI_API_KEY." },
      { status: 501 }
    );
  }

  const contentType = req.headers.get("content-type") || "";

  let messages: { role: string; content: unknown }[];

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.type.startsWith("image/")) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType = file.type;

      messages = [
        { role: "system", content: EXTRACTION_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all stock/ETF holdings from this portfolio screenshot. Return only a JSON array.",
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
            },
          ],
        },
      ];
    } else if (
      file.type === "text/csv" ||
      file.name.endsWith(".csv") ||
      file.type === "application/vnd.ms-excel"
    ) {
      const text = await file.text();
      const truncated = text.slice(0, 15000);

      messages = [
        { role: "system", content: EXTRACTION_PROMPT },
        {
          role: "user",
          content: `Extract all stock/ETF holdings from this CSV data. Return only a JSON array.\n\n\`\`\`csv\n${truncated}\n\`\`\``,
        },
      ];
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload an image (JPG/PNG) or a CSV file." },
        { status: 400 }
      );
    }
  } else {
    try {
      const body = await req.json();
      if (!body.csvText) {
        return NextResponse.json({ error: "csvText or file upload required." }, { status: 400 });
      }
      messages = [
        { role: "system", content: EXTRACTION_PROMPT },
        {
          role: "user",
          content: `Extract all stock/ETF holdings from this CSV data. Return only a JSON array.\n\n\`\`\`csv\n${String(body.csvText).slice(0, 15000)}\n\`\`\``,
        },
      ];
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 4000,
        temperature: 0,
        messages,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI import error:", openaiRes.status, errText);
      return NextResponse.json(
        { error: "AI service error. Check your API key and quota." },
        { status: 502 }
      );
    }

    const data = await openaiRes.json();
    const raw = data.choices?.[0]?.message?.content || "[]";

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ holdings: [], raw });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const holdings = (Array.isArray(parsed) ? parsed : []).map(
      (h: Record<string, unknown>) => ({
        name: String(h.name || "Unknown"),
        ticker: String(h.ticker || "").toUpperCase(),
        shares: Number(h.shares) || 0,
        purchasePrice: Number(h.purchasePrice) || 0,
        displayCurrency: String(h.displayCurrency || "USD").toUpperCase(),
        exchange: String(h.exchange || "").toUpperCase(),
        assetType: h.assetType === "etf" ? "etf" : "stock",
      })
    );

    trackEvent(session.userId, "portfolio_import", { method: contentType.includes("multipart") ? "file" : "csv" });
    return NextResponse.json({ holdings });
  } catch (err) {
    console.error("Import extraction failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to extract portfolio data." }, { status: 500 });
  }
}
