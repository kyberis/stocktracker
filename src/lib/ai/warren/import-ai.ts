import { fetchGatewayChatCompletions, resolveGatewayApiKey } from "@/lib/ai/gateway";
import {
  findUserById,
  incrementAiTokenUsage,
  incrementDailyAiTokenUsage,
  insertAiLog,
  listHoldings,
  resolveAiModelForUserPlan,
  trackEvent,
} from "@/lib/db";
import { canonicalExchangeCode } from "@/lib/db/helpers";
import { normalizeHkYahooSymbol } from "@/lib/market-symbol";
import { mergeHoldingsIntoTransactions } from "@/lib/merge-ai-import-rows";
import { checkAiImportRateLimit, checkGlobalAiCap, incrementGlobalAiCalls, incrementGlobalAiTokens } from "@/lib/rate-limit";
import { getHoldingsLimit } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/lib/types";
import { portfolioImportsTotal } from "@/lib/metrics";
import type { ExtractedHolding, ExtractedTransaction } from "@/hooks/import-types";
import type { RawAttachment } from "./preprocess-attachments";
import type { ImportTransactionRow } from "./types";
import { decodeAttachmentCsv, isImportableImage, isImportableSpreadsheetOrCsv } from "./import-parse";

const EXTRACTION_PROMPT = `You are a portfolio data extractor. Analyze the provided data and extract two things:
1. Current stock/ETF/mutual fund **holdings** (net positions).
2. Individual **transactions** (buys, sells, dividends, fees).

Return a JSON object with two arrays:

{
  "holdings": [ ... ],
  "transactions": [ ... ]
}

**holdings** array — each object:
- name: string (company/ETF name)
- ticker: string (stock ticker symbol, e.g. AAPL, MSFT, AMZN). For government bonds and other instruments with no exchange symbol, use the 12-character ISIN as ticker.
- isin: optional string (include when shown; helps when ticker is unknown)
- shares: number (quantity currently held — net after buys and sells)
- purchasePrice: number (average cost per share)
- displayCurrency: string (currency code, e.g. USD, EUR, GBP)
- exchange: string (stock exchange, e.g. NYSE, NASDAQ, XETRA, LSE, MAD)
- assetType: "stock" | "etf" | "fund"

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
- For tickers, use the standard symbol (e.g. AAPL not Apple Inc). For bonds and similar, put the ISIN in ticker if no Yahoo symbol is known.
- Put current **positions** (including bonds) in **holdings** when there is no trade date; use **transactions** only when you have a real trade date.
- If the exchange is not clear, infer it from the ticker suffix or market context.
- If the currency is not explicit, infer it from the exchange (NYSE/NASDAQ -> USD, LSE -> GBP, XETRA -> EUR, etc.).
- For dividends: set type="dividend", shares=0, pricePerShare=0, totalAmount=gross dividend amount.
- For dividend withholding taxes: do NOT create separate rows; instead add the tax as fees on the dividend row.
- For broker fees/commissions not tied to a trade: set type="fee".
- Dates must be in YYYY-MM-DD format. Convert from any source format.
- Return ONLY the JSON object, no markdown, no explanation.
- If you cannot extract data, return {"holdings":[],"transactions":[]}.`;

export interface AiImportPreview {
  transactions: ImportTransactionRow[];
  warning?: string;
}

export type ExtractAiImportResult =
  | { ok: true; preview: AiImportPreview }
  | { ok: false; error: string; status?: number; reason?: string };

function parseExtractedJson(raw: string): { holdings: Record<string, unknown>[]; transactions: Record<string, unknown>[] } {
  const cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "");
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  let parsed: Record<string, unknown> = {};
  if (objMatch) {
    try {
      parsed = JSON.parse(objMatch[0]) as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  if (!parsed.holdings && !parsed.transactions) {
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        const arr = JSON.parse(arrMatch[0]);
        if (Array.isArray(arr)) parsed = { holdings: arr, transactions: [] };
      } catch {
        /* ignore */
      }
    }
  }
  return {
    holdings: Array.isArray(parsed.holdings) ? (parsed.holdings as Record<string, unknown>[]) : [],
    transactions: Array.isArray(parsed.transactions) ? (parsed.transactions as Record<string, unknown>[]) : [],
  };
}

function normalizeHoldings(rawHoldings: Record<string, unknown>[]): ExtractedHolding[] {
  const TICKER_RE = /^[A-Z0-9]{1,12}([.-][A-Z0-9]{1,6})?$/;
  return rawHoldings
    .map((h) => {
      const assetType: ExtractedHolding["assetType"] =
        h.assetType === "etf" ? "etf" : h.assetType === "fund" ? "fund" : "stock";
      return {
        name: String(h.name || "Unknown"),
        ticker: normalizeHkYahooSymbol(String(h.ticker || h.isin || "").toUpperCase()),
        shares: Number(h.shares) || 0,
        purchasePrice: Number(h.purchasePrice) || 0,
        displayCurrency: String(h.displayCurrency || "USD").toUpperCase(),
        exchange: (() => {
          const raw = String(h.exchange || "").toUpperCase();
          return canonicalExchangeCode(raw) || raw;
        })(),
        assetType,
      };
    })
    .filter((h) => h.ticker && TICKER_RE.test(h.ticker));
}

function normalizeTransactions(rawTxs: Record<string, unknown>[]): ExtractedTransaction[] {
  const TICKER_RE = /^[A-Z0-9]{1,12}([.-][A-Z0-9]{1,6})?$/;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const validTypes = new Set(["buy", "sell", "dividend", "fee"]);
  return rawTxs
    .filter((t) => (t.ticker || t.isin) && t.date)
    .map((t) => ({
      date: String(t.date || ""),
      type: (validTypes.has(String(t.type)) ? String(t.type) : "buy") as ExtractedTransaction["type"],
      ticker: String(t.ticker || t.isin || "").toUpperCase(),
      name: String(t.name || ""),
      shares: Math.abs(Number(t.shares) || 0),
      pricePerShare: Math.abs(Number(t.pricePerShare) || 0),
      totalAmount: Math.abs(Number(t.totalAmount) || 0),
      fees: Math.abs(Number(t.fees) || 0),
      currency: String(t.currency || "USD").toUpperCase(),
    }))
    .filter((t) => TICKER_RE.test(t.ticker) && DATE_RE.test(t.date));
}

export async function extractAiPortfolioFromAttachment(args: {
  userId: string;
  file: RawAttachment;
  role?: string;
  plan?: SubscriptionPlan;
  portfolioId?: string;
  gatewayHeaders?: Headers;
}): Promise<ExtractAiImportResult> {
  const { userId, file, portfolioId, gatewayHeaders } = args;
  const user = await findUserById(userId);
  const plan = (args.plan || user?.plan || "free") as SubscriptionPlan;
  const isAdmin = args.role === "admin";

  if (!isAdmin) {
    const importLimit = await checkAiImportRateLimit(userId);
    if (!importLimit.allowed) {
      return {
        ok: false,
        status: 429,
        reason: "rate_limited",
        error: "Daily AI import limit reached. Try again tomorrow or import a broker CSV instead.",
      };
    }
  }

  const globalCap = await checkGlobalAiCap(args.role);
  if (!globalCap.allowed) {
    return { ok: false, status: 429, error: "Platform AI usage limit reached for this month." };
  }

  const gatewayConfigured = await resolveGatewayApiKey(gatewayHeaders);
  if (!gatewayConfigured) {
    return { ok: false, status: 501, error: "AI Gateway is not configured." };
  }

  let messages: { role: string; content: unknown }[];
  if (isImportableImage(file.mimeType, file.filename)) {
    const mimeType = file.mimeType.startsWith("image/") ? file.mimeType : "image/jpeg";
    const base64 = file.buffer.toString("base64");
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
  } else if (isImportableSpreadsheetOrCsv(file.mimeType, file.filename)) {
    const truncated = decodeAttachmentCsv(file).slice(0, 15000);
    messages = [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: `Extract all holdings and transactions (buys, sells, dividends, fees) from this CSV data. Return the JSON object with holdings and transactions arrays.\n\n\`\`\`csv\n${truncated}\n\`\`\``,
      },
    ];
  } else {
    return { ok: false, status: 400, error: "Upload an image (JPG/PNG) or a CSV/Excel file." };
  }

  const aiLogStart = Date.now();
  const promptUser = typeof messages[1]?.content === "string" ? messages[1].content : "[multimodal content]";
  const model = await resolveAiModelForUserPlan("import_portfolio", plan);

  try {
    const openaiRes = await fetchGatewayChatCompletions(
      { model, max_tokens: 8000, temperature: 0, messages },
      { headers: gatewayHeaders },
    );
    const durationMs = Date.now() - aiLogStart;
    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      insertAiLog({
        userId,
        source: "import",
        model,
        promptSystem: EXTRACTION_PROMPT,
        promptUser,
        durationMs,
        status: "error",
        errorMessage: errText.slice(0, 2000),
      }).catch(() => {});
      return { ok: false, status: 502, error: "AI service error. Try a broker CSV instead." };
    }

    const data = await openaiRes.json();
    const importTokens = data.usage?.total_tokens || 8000;
    const responseContent = data.choices?.[0]?.message?.content || "";
    insertAiLog({
      userId,
      source: "import",
      model,
      promptSystem: EXTRACTION_PROMPT,
      promptUser,
      response: responseContent,
      tokensUsed: importTokens,
      tokensInput: data.usage?.prompt_tokens ?? 0,
      tokensOutput: data.usage?.completion_tokens ?? 0,
      durationMs,
    }).catch(() => {});
    Promise.all([
      incrementAiTokenUsage(userId, importTokens),
      incrementDailyAiTokenUsage(userId, importTokens),
      incrementGlobalAiTokens(importTokens),
    ]).catch(() => {});

    const { holdings: rawHoldings, transactions: rawTxs } = parseExtractedJson(responseContent);
    const holdings = normalizeHoldings(rawHoldings);
    const transactions = normalizeTransactions(rawTxs);
    const merged = mergeHoldingsIntoTransactions(holdings, transactions);

    if (merged.length === 0) {
      portfolioImportsTotal.inc({ source: "csv", status: "empty" });
      return {
        ok: true,
        preview: {
          transactions: [],
          warning: "No holdings or transactions could be extracted from the file.",
        },
      };
    }

    const holdingsLimit = getHoldingsLimit(plan);
    let capped = merged;
    const warnings: string[] = [];
    if (holdingsLimit < Infinity) {
      const existing = await listHoldings(userId, portfolioId);
      const existingTickers = new Set(existing.map((h) => `${h.ticker}|${h.exchange || ""}`));
      const newBuyTickers = [
        ...new Set(
          merged
            .filter((t) => t.type === "buy")
            .map((t) => t.ticker)
            .filter((ticker) => !existingTickers.has(`${ticker}|`)),
        ),
      ];
      const slotsAvailable = Math.max(0, holdingsLimit - existing.length);
      if (newBuyTickers.length > slotsAvailable) {
        const allowed = new Set(newBuyTickers.slice(0, slotsAvailable));
        existing.forEach((h) => allowed.add(h.ticker));
        capped = merged.filter((t) => t.type !== "buy" || allowed.has(t.ticker));
        warnings.push(
          `${newBuyTickers.length - slotsAvailable} holding(s) excluded — plan allows up to ${holdingsLimit} holdings.`,
        );
      }
    }

    trackEvent(userId, "portfolio_import", { method: "warren_ai" });
    portfolioImportsTotal.inc({ source: "csv", status: "success" });
    incrementGlobalAiCalls().catch(() => {});

    return {
      ok: true,
      preview: {
        transactions: capped.map((t) => ({
          date: t.date,
          type: t.type,
          ticker: t.ticker,
          name: t.name,
          isin: t.isin,
          shares: t.shares,
          pricePerShare: t.pricePerShare,
          totalAmount: t.totalAmount,
          fees: t.fees,
          currency: t.currency,
          assetType: t.assetType,
          sourceRef: t.sourceRef,
          exchange: t.exchange,
        })),
        warning: warnings.join(" ") || undefined,
      },
    };
  } catch (err) {
    console.error("[warren/import-ai] extract failed", err);
    trackEvent(userId, "import_error", { method: "ai", reason: "ai_extraction_failed" });
    return { ok: false, status: 500, error: "Failed to extract portfolio data." };
  }
}
