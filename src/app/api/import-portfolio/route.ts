import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { trackEvent, getGlobalOpenAIApiKey, listHoldings, findUserById, incrementAiTokenUsage, incrementDailyAiTokenUsage } from "@/lib/db";
import { checkAiImportRateLimit, checkGlobalAiCap, incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { withMetrics } from "@/lib/with-metrics";
import { portfolioImportsTotal, rateLimitHitsTotal } from "@/lib/metrics";
import { getHoldingsLimit } from "@/lib/subscription";

const EXTRACTION_PROMPT = `You are a portfolio data extractor. Analyze the provided data and extract two things:
1. Current stock/ETF **holdings** (net positions).
2. Individual **transactions** (buys, sells, dividends, fees).

Return a JSON object with two arrays:

{
  "holdings": [ ... ],
  "transactions": [ ... ]
}

**holdings** array — each object:
- name: string (company/ETF name)
- ticker: string (stock ticker symbol, e.g. AAPL, MSFT, AMZN)
- shares: number (quantity currently held — net after buys and sells)
- purchasePrice: number (average cost per share)
- displayCurrency: string (currency code, e.g. USD, EUR, GBP)
- exchange: string (stock exchange, e.g. NYSE, NASDAQ, XETRA, LSE, MAD)
- assetType: "stock" | "etf"

**transactions** array — each object:
- date: string (YYYY-MM-DD format)
- type: "buy" | "sell" | "dividend" | "fee"
- ticker: string (stock ticker symbol)
- name: string (company/ETF name)
- shares: number (quantity — 0 for dividends/fees)
- pricePerShare: number (price per share — 0 for dividends/fees)
- totalAmount: number (absolute total amount of the transaction, always positive)
- fees: number (transaction fees/commissions — 0 if unknown)
- currency: string (currency code)

Rules:
- Extract ALL rows/entries you can identify.
- For tickers, use the standard symbol (e.g. AAPL not Apple Inc).
- If the exchange is not clear, infer it from the ticker suffix or market context.
- If the currency is not explicit, infer it from the exchange (NYSE/NASDAQ -> USD, LSE -> GBP, XETRA -> EUR, etc.).
- For dividends: set type="dividend", shares=0, pricePerShare=0, totalAmount=gross dividend amount.
- For dividend withholding taxes: do NOT create separate rows; instead add the tax as fees on the dividend row.
- For broker fees/commissions not tied to a trade: set type="fee".
- Dates must be in YYYY-MM-DD format. Convert from any source format.
- Return ONLY the JSON object, no markdown, no explanation.
- If you cannot extract data, return {"holdings":[],"transactions":[]}.`;

export const POST = withMetrics("/api/import-portfolio", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const isAdmin = session.role === "admin";
  if (!isAdmin) {
    const importLimit = await checkAiImportRateLimit(session.userId);
    if (!importLimit.allowed) {
      rateLimitHitsTotal.inc({ provider: "openai_import" });
      return NextResponse.json(
        {
          error: "Daily import limit reached. Try again tomorrow.",
          reason: "rate_limited",
          provider: "openai_import",
          limit: importLimit.limit,
          remaining: 0,
          retryAfter: 86400,
        },
        { status: 429, headers: { "Retry-After": "86400" } }
      );
    }
  }

  const globalCap = await checkGlobalAiCap(session.role);
  if (!globalCap.allowed) {
    return NextResponse.json(
      { error: "Platform AI usage limit reached for this month. Please try again next month." },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  const apiKey = getGlobalOpenAIApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Ask your admin to set it in the Admin panel." },
      { status: 501 }
    );
  }

  const contentType = req.headers.get("content-type") || "";

  let messages: { role: string; content: unknown }[];

  let portfolioId: string | undefined;
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    portfolioId = (formData.get("portfolioId") as string) || undefined;
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
              text: "Extract all holdings and transactions (buys, sells, dividends, fees) from this portfolio screenshot. Return the JSON object with holdings and transactions arrays.",
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
          content: `Extract all holdings and transactions (buys, sells, dividends, fees) from this CSV data. Return the JSON object with holdings and transactions arrays.\n\n\`\`\`csv\n${truncated}\n\`\`\``,
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
      portfolioId = body.portfolioId || undefined;
      if (!body.csvText) {
        return NextResponse.json({ error: "csvText or file upload required." }, { status: 400 });
      }
      messages = [
        { role: "system", content: EXTRACTION_PROMPT },
        {
          role: "user",
          content: `Extract all holdings and transactions (buys, sells, dividends, fees) from this CSV data. Return the JSON object with holdings and transactions arrays.\n\n\`\`\`csv\n${String(body.csvText).slice(0, 15000)}\n\`\`\``,
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
        max_tokens: 8000,
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
    const importTokens = data.usage?.total_tokens || 8000;
    Promise.all([
      incrementAiTokenUsage(session.userId, importTokens),
      incrementDailyAiTokenUsage(session.userId, importTokens),
      incrementGlobalAiTokens(importTokens),
    ]).catch(() => {});
    let raw = data.choices?.[0]?.message?.content || "{}";

    raw = raw.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "");

    const objMatch = raw.match(/\{[\s\S]*\}/);
    let parsed: Record<string, unknown> = {};

    if (objMatch) {
      try { parsed = JSON.parse(objMatch[0]); } catch { /* fall through */ }
    }

    if (!parsed.holdings && !parsed.transactions) {
      const arrMatch = raw.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try {
          const arr = JSON.parse(arrMatch[0]);
          if (Array.isArray(arr)) parsed = { holdings: arr, transactions: [] };
        } catch { /* ignore */ }
      }
    }

    const rawHoldings = Array.isArray(parsed.holdings) ? parsed.holdings : [];
    const rawTxs = Array.isArray(parsed.transactions) ? parsed.transactions : [];

    const TICKER_RE = /^[A-Z0-9]{1,12}([.-][A-Z0-9]{1,6})?$/;
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

    const holdings = rawHoldings
      .map((h: Record<string, unknown>) => ({
        name: String(h.name || "Unknown"),
        ticker: String(h.ticker || "").toUpperCase(),
        shares: Number(h.shares) || 0,
        purchasePrice: Number(h.purchasePrice) || 0,
        displayCurrency: String(h.displayCurrency || "USD").toUpperCase(),
        exchange: String(h.exchange || "").toUpperCase(),
        assetType: h.assetType === "etf" ? "etf" : "stock",
      }))
      .filter((h) => h.ticker && TICKER_RE.test(h.ticker));

    const validTypes = new Set(["buy", "sell", "dividend", "fee"]);
    const transactions = rawTxs
      .filter((t: Record<string, unknown>) => t.ticker && t.date)
      .map((t: Record<string, unknown>) => ({
        date: String(t.date || ""),
        type: validTypes.has(String(t.type)) ? String(t.type) : "buy",
        ticker: String(t.ticker || "").toUpperCase(),
        name: String(t.name || ""),
        shares: Math.abs(Number(t.shares) || 0),
        pricePerShare: Math.abs(Number(t.pricePerShare) || 0),
        totalAmount: Math.abs(Number(t.totalAmount) || 0),
        fees: Math.abs(Number(t.fees) || 0),
        currency: String(t.currency || "USD").toUpperCase(),
      }))
      .filter((t) => TICKER_RE.test(t.ticker) && DATE_RE.test(t.date));

    const hadInput = rawHoldings.length > 0 || rawTxs.length > 0;
    const droppedHoldings = rawHoldings.length - holdings.length;
    const droppedTxs = rawTxs.length - transactions.length;

    if (holdings.length === 0 && transactions.length === 0) {
      portfolioImportsTotal.inc({ source: "csv", status: "empty" });
      return NextResponse.json({
        holdings,
        transactions,
        warning: hadInput
          ? "AI extracted data but all entries had invalid tickers or dates and were filtered out. Please review your source file."
          : "No holdings or transactions could be extracted from the provided data.",
      });
    }

    trackEvent(session.userId, "portfolio_import", { method: contentType.includes("multipart") ? "file" : "csv" });
    portfolioImportsTotal.inc({ source: "csv", status: "success" });
    incrementGlobalAiCalls().catch(() => {});

    const warnings: string[] = [];
    if (droppedHoldings > 0) warnings.push(`${droppedHoldings} holding(s) removed due to invalid ticker format.`);
    if (droppedTxs > 0) warnings.push(`${droppedTxs} transaction(s) removed due to invalid ticker or date format.`);

    const user = await findUserById(session.userId);
    const plan = (user?.plan || session.plan) ?? "free";
    const holdingsLimit = getHoldingsLimit(plan);
    let cappedHoldings = holdings;
    if (holdingsLimit < Infinity) {
      const existing = await listHoldings(session.userId, portfolioId);
      const existingTickers = new Set(existing.map((h) => `${h.ticker}|${h.exchange || ""}`));
      const newOnly = holdings.filter((h) => !existingTickers.has(`${h.ticker}|${h.exchange || ""}`));
      const slotsAvailable = Math.max(0, holdingsLimit - existing.length);
      if (newOnly.length > slotsAvailable) {
        const kept = holdings.filter((h) => existingTickers.has(`${h.ticker}|${h.exchange || ""}`));
        const allowed = newOnly.slice(0, slotsAvailable);
        cappedHoldings = [...kept, ...allowed];
        const dropped = newOnly.length - slotsAvailable;
        warnings.push(
          `${dropped} holding(s) excluded — Plan allows up to ${holdingsLimit} holdings. Upgrade to Trefolio for unlimited.`
        );
      }
    }

    return NextResponse.json({
      holdings: cappedHoldings,
      transactions,
      ...(warnings.length > 0 ? { warning: warnings.join(" ") } : {}),
    });
  } catch (err) {
    console.error("Import extraction failed:", err instanceof Error ? err.message : err);
    portfolioImportsTotal.inc({ source: "csv", status: "error" });
    return NextResponse.json({ error: "Failed to extract portfolio data." }, { status: 500 });
  }
});
