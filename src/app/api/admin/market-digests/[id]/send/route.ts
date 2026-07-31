import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  getMarketDigestWithTranslations,
  markDigestEmailSent,
  getUsersForDigestEmail,
  listHoldings,
  listCashEntries,
  listPortfolios,
  logEmailSend,
  hasEmailBeenSent,
} from "@/lib/db";
import { isMarketingEmailAllowed, sendEmail } from "@/lib/email";
import { getAppRouteParam } from "@/lib/api-route-params";
import { withMetrics } from "@/lib/with-metrics";
import { getQuotesWithCache, getRatesWithCache } from "@/lib/quote-cache";
import { convertToEUR, resolveQuoteCurrency } from "@/lib/utils";
import { ensureInitialized } from "@/lib/db/client";
import { num } from "@/lib/db/helpers";
import type { ExchangeRates } from "@/lib/types";
import { ALL_EUR_FX_PAIRS } from "@/lib/fx-pairs";

export const maxDuration = 120;

const FX_PAIRS = ALL_EUR_FX_PAIRS;

interface PortfolioStats {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  weekChange: number | null;
  weekChangePct: number | null;
  holdingCount: number;
  currency: string;
  currencySymbol: string;
}

async function getSnapshotValue(userId: string, portfolioId: string, date: string): Promise<number | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT total_value_eur FROM portfolio_snapshots
          WHERE user_id = ? AND portfolio_id = ? AND date <= ?
          ORDER BY date DESC LIMIT 1`,
    args: [userId, portfolioId, date],
  });
  if (result.rows.length === 0) return null;
  return num(result.rows[0].total_value_eur);
}

async function computePortfolioStats(userId: string, portfolioId: string): Promise<PortfolioStats | null> {
  if (!portfolioId) return null;

  const [holdings, cashEntries, portfolios] = await Promise.all([
    listHoldings(userId, portfolioId),
    listCashEntries(userId, portfolioId),
    listPortfolios(userId),
  ]);

  if (holdings.length === 0) return null;

  const portfolio = portfolios.find((p) => p.id === portfolioId);
  const baseCurrency = portfolio?.currency || "EUR";
  const currencySymbol = baseCurrency === "USD" ? "$" : baseCurrency === "GBP" ? "£" : "€";

  const tickers = [...new Set(holdings.map((h) => h.ticker).filter(Boolean))];
  const neededCurrencies = new Set(
    holdings.map((h) => h.displayCurrency.toUpperCase()).filter((c) => c !== "EUR" && c !== "GBX"),
  );
  const neededPairs = FX_PAIRS.filter((pair) => neededCurrencies.has(pair.substring(3)));
  if (holdings.some((h) => h.displayCurrency === "GBX" || h.displayCurrency === "GBp")) {
    if (!neededPairs.includes("EURGBP")) neededPairs.push("EURGBP");
  }

  const [quotes, exchangeRates] = await Promise.all([
    getQuotesWithCache(tickers),
    getRatesWithCache(neededPairs),
  ]);

  let currentValueEUR = 0;
  let totalCostEUR = 0;

  for (const h of holdings) {
    const q = quotes[h.ticker];
    if (q && q.regularMarketPrice > 0) {
      const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, q.currency);
      const valueInQuoteCurrency = h.shares * q.regularMarketPrice;
      currentValueEUR += convertToEUR(valueInQuoteCurrency, quoteCurrency, exchangeRates as ExchangeRates);
    } else if (h.valueInEUR > 0) {
      currentValueEUR += h.valueInEUR;
    }
    totalCostEUR += h.shares * h.purchasePrice;
  }
  for (const cash of cashEntries) {
    currentValueEUR += cash.amountEUR;
    totalCostEUR += cash.amountEUR;
  }

  const totalGainLoss = currentValueEUR - totalCostEUR;
  const totalGainLossPct = totalCostEUR > 0 ? (totalGainLoss / totalCostEUR) * 100 : 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekStartDate = sevenDaysAgo.toISOString().slice(0, 10);

  const weekStartValue = await getSnapshotValue(userId, portfolioId, weekStartDate);
  let weekChange: number | null = null;
  let weekChangePct: number | null = null;
  if (weekStartValue && weekStartValue > 0) {
    weekChange = currentValueEUR - weekStartValue;
    weekChangePct = (weekChange / weekStartValue) * 100;
  }

  return {
    totalValue: currentValueEUR,
    totalCost: totalCostEUR,
    totalGainLoss,
    totalGainLossPct,
    weekChange,
    weekChangePct,
    holdingCount: holdings.length,
    currency: baseCurrency,
    currencySymbol,
  };
}

function fmtMoney(value: number, symbol: string): string {
  return `${symbol}${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function signedMoney(value: number, symbol: string): string {
  return `${value >= 0 ? "+" : "−"}${fmtMoney(value, symbol)}`;
}

function buildDigestEmailHtml(
  title: string,
  summary: string,
  keyPoints: string[],
  tickers: string[],
  sentiment: string,
  portfolioStats: PortfolioStats | null,
): string {
  const sentimentColor =
    sentiment === "bullish" ? "#10b981" : sentiment === "bearish" ? "#ef4444" : "#6b7280";
  const sentimentLabel =
    sentiment === "bullish" ? "Bullish" : sentiment === "bearish" ? "Bearish" : "Neutral";

  const pointsHtml = keyPoints
    .map((p) => `<li style="margin-bottom:8px;color:#374151;line-height:1.5;font-size:14px;">${p}</li>`)
    .join("");

  const tickersHtml = tickers.length > 0
    ? `<div style="margin-top:16px;"><strong style="color:#6b7280;font-size:13px;">Mentioned tickers:</strong> <span style="color:#374151;">${tickers.join(", ")}</span></div>`
    : "";

  const ps = portfolioStats;
  const portfolioSection = ps ? buildPortfolioSection(ps) : "";
  const baseUrl = process.env.APP_BASE_URL || "https://trefolio.com";
  const logoUrl = `${baseUrl}/email-logo@2x.png`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f8fafc;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;">

<div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:24px 28px;text-align:center;">
  <img src="${logoUrl}" alt="trefolio" width="36" height="36" style="display:inline-block;width:36px;height:36px;border-radius:8px;vertical-align:middle;margin-right:8px;" /><span style="color:#fff;font-size:20px;font-weight:700;vertical-align:middle;letter-spacing:-0.3px;">trefolio</span>
  <div style="font-size:11px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.05em;margin-top:8px;">Market Insight</div>
</div>

<div style="padding:20px 28px;border-bottom:1px solid #e5e7eb;text-align:center;">
  <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;text-align:center;line-height:1.3;">${title}</h1>
  <div style="text-align:center;">
    <span style="display:inline-block;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;color:white;background:${sentimentColor};">
      ${sentimentLabel}
    </span>
  </div>
</div>

${portfolioSection}

<div style="padding:20px 28px;">
  ${summary.split("\n").filter((p) => p.trim()).map((p) => `<p style="margin:0 0 12px;line-height:1.65;color:#374151;font-size:14px;">${p}</p>`).join("")}
</div>

${pointsHtml ? `<div style="padding:0 28px 20px;"><ul style="padding-left:18px;margin:0;">${pointsHtml}</ul></div>` : ""}

${tickersHtml ? `<div style="padding:0 28px 20px;">${tickersHtml}</div>` : ""}

<div style="padding:16px 28px;text-align:center;">
  <a href="${process.env.APP_BASE_URL || "https://trefolio.com"}" style="display:inline-block;padding:10px 28px;border-radius:10px;background:#10b981;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">View your dashboard</a>
</div>

<div style="padding:16px 28px;border-top:1px solid #e5e7eb;color:#94a3b8;font-size:11px;text-align:center;font-style:italic;">
  For informational purposes only — not financial advice.<br/>
  <a href="{{unsubscribe_url}}" style="color:#94a3b8;">Unsubscribe</a>
</div>

</div></body></html>`;
}

function buildPortfolioSection(ps: PortfolioStats): string {
  const valueColor = "#0f172a";

  const glColor = ps.totalGainLoss >= 0 ? "#10b981" : "#ef4444";
  const glBg = ps.totalGainLoss >= 0 ? "#f0fdf4" : "#fef2f2";

  const weekColor = (ps.weekChange ?? 0) >= 0 ? "#10b981" : "#ef4444";
  const weekBg = (ps.weekChange ?? 0) >= 0 ? "#f0fdf4" : "#fef2f2";

  const weekVal = ps.weekChange != null
    ? `${signedMoney(ps.weekChange, ps.currencySymbol)}<br/><span style="font-size:10px;color:${weekColor};">${fmtPct(ps.weekChangePct!)}</span>`
    : "—";

  return `
<div style="padding:20px 28px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
  <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">Your Portfolio</div>
  <div style="font-size:24px;font-weight:700;color:${valueColor};margin-bottom:12px;">${fmtMoney(ps.totalValue, ps.currencySymbol)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:6px 0;">
    <tr>
      <td width="50%" style="background:${glBg};border-radius:8px;padding:10px;text-align:center;vertical-align:top;">
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;">Total G/L</div>
        <div style="font-size:15px;font-weight:700;color:${glColor};margin-top:2px;">${signedMoney(ps.totalGainLoss, ps.currencySymbol)}</div>
        <div style="font-size:10px;color:${glColor};">${fmtPct(ps.totalGainLossPct)}</div>
      </td>
      <td width="50%" style="background:${weekBg};border-radius:8px;padding:10px;text-align:center;vertical-align:top;">
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;">7-Day Change</div>
        <div style="font-size:15px;font-weight:700;color:${weekColor};margin-top:2px;">${weekVal}</div>
      </td>
    </tr>
  </table>
  <div style="font-size:11px;color:#94a3b8;margin-top:8px;">${ps.holdingCount} position${ps.holdingCount !== 1 ? "s" : ""} tracked</div>
</div>`;
}

export const POST = withMetrics("/api/admin/market-digests/[id]/send", async (
  req: NextRequest,
  ctx: unknown,
) => {
  const { session, error } = await requireAdmin(req);
  if (error || !session) return error!;

  const id = getAppRouteParam(req, ctx, "id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: { testEmail?: string; testLanguage?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* no body = full send */
  }

  const digest = await getMarketDigestWithTranslations(id);
  if (!digest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const translationMap = new Map(digest.translations.map((t) => [t.language, t]));
  const enTranslation = translationMap.get("en");
  if (!enTranslation) {
    return NextResponse.json({ error: "No English translation found" }, { status: 400 });
  }

  // ── Test send: single email to a specific address ──
  if (body.testEmail) {
    const lang = body.testLanguage || "en";
    const t = translationMap.get(lang) || enTranslation;

    let testStats: PortfolioStats | null = null;
    if (session.userId) {
      try {
        const adminPortfolios = await listPortfolios(session.userId);
        const defaultP = adminPortfolios.find((p) => p.isDefault) || adminPortfolios[0];
        if (defaultP) testStats = await computePortfolioStats(session.userId, defaultP.id);
      } catch { /* portfolio stats are best-effort */ }
    }

    const html = buildDigestEmailHtml(
      t.title,
      t.summary,
      t.keyPoints,
      digest.mentionedTickers,
      digest.sentiment,
      testStats,
    );

    const result = await sendEmail({
      to: body.testEmail,
      subject: `[TEST] trefolio Market Insight: ${t.title}`,
      html,
      internal: true,
    });

    return NextResponse.json({
      ok: result.success,
      test: true,
      to: body.testEmail,
      language: lang,
      error: result.error,
    });
  }

  // ── Full send: all verified users ──
  if (process.env.MARKET_DIGEST_EMAIL_BROADCAST_DISABLED === "1") {
    return NextResponse.json(
      {
        error:
          "Bulk market digest email is disabled (MARKET_DIGEST_EMAIL_BROADCAST_DISABLED=1). Users can read digests in the app under Daily digests.",
      },
      { status: 403 },
    );
  }

  if (digest.status !== "published") {
    return NextResponse.json({ error: "Digest must be published before sending" }, { status: 400 });
  }
  if (digest.emailSent) {
    return NextResponse.json({ error: "Email already sent for this digest" }, { status: 409 });
  }

  const users = await getUsersForDigestEmail();
  if (users.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "No eligible users" });
  }

  const digestTemplateId = `digest:${id}`;
  let sent = 0;
  let failed = 0;
  let skippedDuplicate = 0;
  let skippedOptOut = 0;
  const results: { userId: string; email: string; status: string; resendId?: string; error?: string }[] = [];

  for (const user of users) {
    const alreadySent = await hasEmailBeenSent(digestTemplateId, user.id);
    if (alreadySent) {
      skippedDuplicate++;
      results.push({ userId: user.id, email: user.email, status: "skipped_duplicate" });
      continue;
    }

    const t = translationMap.get(user.language) || enTranslation;
    const subject = `trefolio Market Insight: ${t.title}`;

    if (!(await isMarketingEmailAllowed(user.id))) {
      skippedOptOut++;
      results.push({ userId: user.id, email: user.email, status: "suppressed" });
      logEmailSend({
        templateId: digestTemplateId,
        userId: user.id,
        emailTo: user.email,
        subject,
        bodyHtml: "",
        status: "suppressed",
      }).catch(() => {});
      continue;
    }

    let userStats: PortfolioStats | null = null;
    if (user.defaultPortfolioId) {
      try {
        userStats = await computePortfolioStats(user.id, user.defaultPortfolioId);
      } catch (err) {
        console.error(`[market-digest-send] Portfolio stats failed for ${user.id}:`, err instanceof Error ? err.message : err);
      }
    }

    const html = buildDigestEmailHtml(
      t.title,
      t.summary,
      t.keyPoints,
      digest.mentionedTickers,
      digest.sentiment,
      userStats,
    );

    try {
      const result = await sendEmail({
        to: user.email,
        subject,
        html,
        userId: user.id,
      });

      const status = result.suppressed ? "suppressed" : result.success ? "sent" : "failed";
      const errorMsg = result.error || undefined;

      logEmailSend({
        resendId: result.messageId,
        templateId: digestTemplateId,
        userId: user.id,
        emailTo: user.email,
        subject,
        bodyHtml: html,
        status,
      }).catch(() => {});

      if (result.suppressed) {
        skippedOptOut++;
        results.push({ userId: user.id, email: user.email, status: "suppressed" });
      } else if (result.success) {
        sent++;
        results.push({ userId: user.id, email: user.email, status: "sent", resendId: result.messageId });
      } else {
        failed++;
        results.push({ userId: user.id, email: user.email, status: "failed", error: errorMsg });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      failed++;
      results.push({ userId: user.id, email: user.email, status: "failed", error: errorMsg });

      logEmailSend({
        templateId: digestTemplateId,
        userId: user.id,
        emailTo: user.email,
        subject,
        bodyHtml: html,
        status: "failed",
      }).catch(() => {});
    }
  }

  await markDigestEmailSent(id);
  return NextResponse.json({
    ok: true,
    sent,
    failed,
    skippedDuplicate,
    skippedOptOut,
    total: users.length,
    results,
  });
});
