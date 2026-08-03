import { formatCompactNumber } from "@/lib/utils";

type EarningsCalendarDetails = {
  epsEstimated?: number | null;
  eps?: number | null;
  revenue?: number | null;
  revenueEstimated?: number | null;
  fiscalDateEnding?: string | null;
};

function looksLikeJsonObject(value: string): boolean {
  const t = value.trim();
  return t.startsWith("{") && t.endsWith("}");
}

function isEarningsCalendarDetails(value: unknown): value is EarningsCalendarDetails {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return (
    "epsEstimated" in o ||
    "eps" in o ||
    "revenue" in o ||
    "revenueEstimated" in o ||
    "fiscalDateEnding" in o
  );
}

function formatEps(value: number): string {
  return `$${Number(value).toFixed(2)}`;
}

function formatRevenue(value: number): string {
  return `$${formatCompactNumber(value)}`;
}

/**
 * Turn calendar `details` (often FMP/AV JSON) into a scannable feed excerpt.
 * Returns null when there is nothing useful to show (so callers can use a template).
 */
export function formatEarningsCalendarDetails(details: string | null | undefined): string | null {
  if (!details?.trim()) return null;
  const trimmed = details.trim();
  if (!looksLikeJsonObject(trimmed)) return trimmed;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!isEarningsCalendarDetails(parsed)) return null;

    const parts: string[] = [];

    if (parsed.eps != null && parsed.epsEstimated != null) {
      parts.push(`EPS ${formatEps(parsed.eps)} vs est. ${formatEps(parsed.epsEstimated)}`);
    } else if (parsed.eps != null) {
      parts.push(`EPS ${formatEps(parsed.eps)}`);
    } else if (parsed.epsEstimated != null) {
      parts.push(`Est. EPS ${formatEps(parsed.epsEstimated)}`);
    }

    if (parsed.revenue != null && parsed.revenueEstimated != null) {
      parts.push(
        `Revenue ${formatRevenue(parsed.revenue)} vs est. ${formatRevenue(parsed.revenueEstimated)}`,
      );
    } else if (parsed.revenue != null) {
      parts.push(`Revenue ${formatRevenue(parsed.revenue)}`);
    } else if (parsed.revenueEstimated != null) {
      parts.push(`Est. revenue ${formatRevenue(parsed.revenueEstimated)}`);
    }

    if (parsed.fiscalDateEnding && String(parsed.fiscalDateEnding).trim()) {
      parts.push(`Fiscal period ending ${String(parsed.fiscalDateEnding).trim()}`);
    }

    return parts.length > 0 ? parts.join(" · ") : null;
  } catch {
    return null;
  }
}

/**
 * Replace raw earnings-calendar JSON in digest bullets with a readable line.
 * Leaves non-JSON bullets unchanged.
 */
export function sanitizeDigestBullet(bullet: string): string {
  if (!looksLikeJsonObject(bullet)) return bullet;
  return formatEarningsCalendarDetails(bullet) ?? "Consensus figures from the earnings calendar.";
}
