import type { WeeklyDigestStats } from "@/lib/db/weekly-digest";

export function buildWeeklyDigestEmailHtml(
  summaryText: string,
  stats: WeeklyDigestStats,
  baseUrl: string,
  weekStart: string,
  weekEnd: string,
  options?: { fractionDigits?: 0 | 2; includeUnsubscribePlaceholder?: boolean },
): string {
  const fractionDigits = options?.fractionDigits ?? 2;
  const includeUnsub = options?.includeUnsubscribePlaceholder ?? true;
  const currency = stats.currency || "EUR";
  const currencySymbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "€";
  const fmtNum = (n: number) =>
    Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
  const weekChange = stats.weekChange !== undefined
    ? `${stats.weekChange >= 0 ? "+" : "−"}${currencySymbol}${fmtNum(stats.weekChange)}`
    : "—";
  const weekChangeColor = stats.weekChange !== undefined
    ? (stats.weekChange >= 0 ? "#10b981" : "#ef4444")
    : "#64748b";
  const weekChangeBg = stats.weekChange !== undefined
    ? (stats.weekChange >= 0 ? "#f0fdf4" : "#fef2f2")
    : "#f8fafc";
  const best = stats.bestPerformer
    ? `${stats.bestPerformer.ticker} ${stats.bestPerformer.changePct >= 0 ? "+" : ""}${stats.bestPerformer.changePct.toFixed(fractionDigits)}%`
    : "—";
  const bestColor = stats.bestPerformer
    ? (stats.bestPerformer.changePct >= 0 ? "#10b981" : "#ef4444")
    : "#64748b";
  const divs = stats.dividendsReceived && stats.dividendsReceived > 0
    ? `${currencySymbol}${stats.dividendsReceived.toFixed(2)}`
    : "None this week";

  const logoUrl = `${baseUrl}/email-logo@2x.png`;
  const unsub = includeUnsub
    ? `AI-generated summary. Not financial advice. <a href="{{unsubscribe_url}}" style="color:#94a3b8;">Unsubscribe</a>`
    : `AI-generated summary. Not financial advice.`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f8fafc;font-family:'DM Sans',-apple-system,sans-serif;">
<div style="max-width:520px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;">
<div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:24px 28px;text-align:center;">
<img src="${logoUrl}" alt="trefolio" width="36" height="36" style="display:inline-block;width:36px;height:36px;border-radius:8px;vertical-align:middle;margin-right:8px;" /><span style="color:#fff;font-size:20px;font-weight:700;vertical-align:middle;letter-spacing:-0.3px;">trefolio</span>
</div>
<div style="padding:28px;">
<div style="text-align:center;margin-bottom:20px;">
<div style="font-size:18px;font-weight:700;color:#0f172a;">Your Weekly Portfolio Digest</div>
<div style="font-size:12px;color:#64748b;">${weekStart} — ${weekEnd}</div>
</div>
<div style="display:flex;gap:8px;margin-bottom:20px;">
<div style="flex:1;background:${weekChangeBg};border-radius:8px;padding:10px;text-align:center;">
<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Holdings vs snapshot</div>
<div style="font-size:16px;font-weight:700;color:${weekChangeColor};">${weekChange}</div>
</div>
<div style="flex:1;background:#f0fdf4;border-radius:8px;padding:10px;text-align:center;">
<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Best (session)</div>
<div style="font-size:16px;font-weight:700;color:${bestColor};">${best}</div>
</div>
<div style="flex:1;background:#f8fafc;border-radius:8px;padding:10px;text-align:center;">
<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Dividends</div>
<div style="font-size:16px;font-weight:700;color:#0f172a;">${divs}</div>
</div>
</div>
<div style="font-size:11px;color:#94a3b8;line-height:1.5;margin-bottom:14px;padding:0 4px;">
Change compares current holdings (excludes cash) to your last saved snapshot on or before week start. It is not realized profit and can reflect trades or deposits. “Best (session)” uses the provider’s latest session %, not a full calendar week.
</div>
<div style="font-size:14px;color:#475569;line-height:1.7;margin-bottom:20px;">${summaryText}</div>
<div style="text-align:center;margin-bottom:16px;">
<a href="${baseUrl}" style="display:inline-block;padding:10px 28px;border-radius:10px;background:#10b981;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">View full dashboard</a>
</div>
<div style="font-size:10px;color:#94a3b8;text-align:center;font-style:italic;">
${unsub}
</div>
</div></div></body></html>`;
}
