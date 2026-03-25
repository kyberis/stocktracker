import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { ensureInitialized } from "@/lib/db/client";
import { canAccessFeature } from "@/lib/subscription";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

interface Point {
  date: string;
  value: number;
  invested: number;
  stockValue: number;
  etfValue: number;
  cryptoValue: number;
}

/** Same calendar day one month earlier (local): Mar 19 → Feb 19, not rolling 30 days. */
function oneCalendarMonthAgoDateString(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayDateString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function computeStartDate(range: string): string {
  const now = new Date();
  switch (range) {
    case "1d":
      return todayDateString();
    case "1w":
      now.setDate(now.getDate() - 7);
      break;
    case "1m":
      return oneCalendarMonthAgoDateString();
    case "3m":
      now.setMonth(now.getMonth() - 3);
      break;
    case "6m":
      now.setMonth(now.getMonth() - 6);
      break;
    case "ytd":
      return `${now.getFullYear()}-01-01`;
    case "1y":
      now.setFullYear(now.getFullYear() - 1);
      break;
    case "all":
      now.setFullYear(now.getFullYear() - 100);
      break;
    default:
      return oneCalendarMonthAgoDateString();
  }
  return now.toISOString().slice(0, 10);
}

type Granularity = "five-minute" | "hourly" | "daily" | "weekly";

const FIVE_MIN_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function parseSnapshotTime(dateStr: string): number {
  const s = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
  const d = new Date(s);
  return d.getTime();
}

function clipPointsToWindow(points: Point[], windowStartMs: number, windowEndMs: number): Point[] {
  return points.filter((p) => {
    const t = parseSnapshotTime(p.date);
    return Number.isFinite(t) && t >= windowStartMs && t <= windowEndMs;
  });
}

/**
 * Where consecutive snapshots are more than ~1h apart, insert hourly points by linear interpolation
 * on **portfolio value** so the line “moves” smoothly. **Invested capital (cost basis) is not
 * interpolated** between marks — it stays flat at the previous real snapshot until the next real
 * row, so we don’t show a fake gradual “invested” ramp (cost basis only changes on real events /
 * recomputation, not hour-by-hour).
 * Sub-hourly real samples (e.g. 15‑min buckets) are kept as-is.
 */
function densifyHourlyTimeline(raw: Point[], windowStartMs: number, windowEndMs: number): Point[] {
  if (raw.length === 0) return [];
  const sorted = [...raw].sort((a, b) => parseSnapshotTime(a.date) - parseSnapshotTime(b.date));
  const out: Point[] = [];

  for (let i = 0; i < sorted.length; i++) {
    out.push(sorted[i]);
    if (i === sorted.length - 1) break;
    const t0 = parseSnapshotTime(sorted[i].date);
    const t1 = parseSnapshotTime(sorted[i + 1].date);
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) continue;
    const gap = t1 - t0;
    if (gap <= HOUR_MS) continue;
    const v0 = sorted[i].value;
    const v1 = sorted[i + 1].value;
    const inv0 = sorted[i].invested;
    const sv0 = sorted[i].stockValue;
    const sv1 = sorted[i + 1].stockValue;
    const ev0 = sorted[i].etfValue;
    const ev1 = sorted[i + 1].etfValue;
    const cv0 = sorted[i].cryptoValue;
    const cv1 = sorted[i + 1].cryptoValue;
    let t = t0 + HOUR_MS;
    while (t < t1 - 0.5) {
      const ratio = (t - t0) / (t1 - t0);
      out.push({
        date: new Date(t).toISOString(),
        value: v0 + ratio * (v1 - v0),
        invested: inv0,
        stockValue: sv0 + ratio * (sv1 - sv0),
        etfValue: ev0 + ratio * (ev1 - ev0),
        cryptoValue: cv0 + ratio * (cv1 - cv0),
      });
      t += HOUR_MS;
    }
  }

  return clipPointsToWindow(out, windowStartMs, windowEndMs);
}

/**
 * Like densifyHourlyTimeline but with 5-minute steps for the 1D intraday view.
 * Fills gaps > 5 min with linear interpolation on value; invested stays flat.
 */
function densifyFiveMinuteTimeline(raw: Point[], windowStartMs: number, windowEndMs: number): Point[] {
  if (raw.length === 0) return [];
  const sorted = [...raw].sort((a, b) => parseSnapshotTime(a.date) - parseSnapshotTime(b.date));
  const out: Point[] = [];

  for (let i = 0; i < sorted.length; i++) {
    out.push(sorted[i]);
    if (i === sorted.length - 1) break;
    const t0 = parseSnapshotTime(sorted[i].date);
    const t1 = parseSnapshotTime(sorted[i + 1].date);
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) continue;
    const gap = t1 - t0;
    if (gap <= FIVE_MIN_MS) continue;
    const v0 = sorted[i].value;
    const v1 = sorted[i + 1].value;
    const inv0 = sorted[i].invested;
    const sv0 = sorted[i].stockValue;
    const sv1 = sorted[i + 1].stockValue;
    const ev0 = sorted[i].etfValue;
    const ev1 = sorted[i + 1].etfValue;
    const cv0 = sorted[i].cryptoValue;
    const cv1 = sorted[i + 1].cryptoValue;
    let t = t0 + FIVE_MIN_MS;
    while (t < t1 - 0.5) {
      const ratio = (t - t0) / (t1 - t0);
      out.push({
        date: new Date(t).toISOString(),
        value: v0 + ratio * (v1 - v0),
        invested: inv0,
        stockValue: sv0 + ratio * (sv1 - sv0),
        etfValue: ev0 + ratio * (ev1 - ev0),
        cryptoValue: cv0 + ratio * (cv1 - cv0),
      });
      t += FIVE_MIN_MS;
    }
  }

  return clipPointsToWindow(out, windowStartMs, windowEndMs);
}

/** 1D → five-minute. 1W, 1M, YTD, 1Y → hourly. MAX (all): hourly if span ≤ ~1 year, else weekly. */
function resolveGranularity(range: string, rawPoints: Point[]): Granularity {
  if (range === "all") {
    if (rawPoints.length < 2) return "hourly";
    const t0 = parseSnapshotTime(rawPoints[0].date);
    const t1 = parseSnapshotTime(rawPoints[rawPoints.length - 1].date);
    if (!Number.isFinite(t0) || !Number.isFinite(t1)) return "hourly";
    const spanMs = Math.abs(t1 - t0);
    const ONE_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
    return spanMs > ONE_YEAR_MS ? "weekly" : "hourly";
  }
  switch (range) {
    case "1d":
      return "five-minute";
    case "1w":
    case "1m":
    case "ytd":
    case "1y":
      return "hourly";
    default:
      return "weekly";
  }
}

/**
 * Bucket key used for grouping points.
 * - hourly: keep the full date string (no aggregation)
 * - daily:  YYYY-MM-DD
 * - weekly: YYYY-Www (ISO week)
 */
function bucketKey(dateStr: string, granularity: Granularity): string {
  if (granularity === "five-minute" || granularity === "hourly") return dateStr;
  const day = dateStr.slice(0, 10);
  if (granularity === "daily") return day;
  const d = new Date(day);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Downsample points to the requested granularity by keeping the last entry
 * per bucket (latest value for each day / week).
 */
function downsample(points: Point[], granularity: Granularity): Point[] {
  if (granularity === "five-minute" || granularity === "hourly") return points;

  const buckets = new Map<string, Point>();
  for (const p of points) {
    const key = bucketKey(p.date, granularity);
    buckets.set(key, p);
  }
  return [...buckets.values()];
}

export const GET = withMetrics("/api/portfolio/history", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "1m";
  const portfolioId = url.searchParams.get("portfolioId") || "";

  const plan = (session.plan ?? "free") as "free" | "starter" | "pro";
  const isPro = plan === "pro";
  const canViewFull = canAccessFeature("portfolio-history-full", {
    plan,
    aiCallsThisMonth: 0,
  }).allowed;

  const client = await ensureInitialized();

  let sql: string;
  let args: (string | number)[];
  let targetDay1d = "";

  const paidRanges = new Set(["all", "1y", "6m", "3m", "ytd"]);

  const cols = "date, total_value_eur as value, total_invested_eur as invested, stock_value_eur as stockValue, etf_value_eur as etfValue, crypto_value_eur as cryptoValue";

  if (paidRanges.has(range)) {
    if (!canViewFull) {
      const cappedStart = oneCalendarMonthAgoDateString();
      sql = `SELECT ${cols}
             FROM portfolio_snapshots
             WHERE user_id = ? AND portfolio_id = ? AND date >= ?
             ORDER BY date ASC`;
      args = [session.userId, portfolioId, cappedStart];
    } else if (range === "ytd") {
      const year = new Date().getFullYear();
      sql = `SELECT ${cols}
             FROM portfolio_snapshots
             WHERE user_id = ? AND portfolio_id = ? AND date >= ?
             ORDER BY date ASC`;
      args = [session.userId, portfolioId, `${year}-01-01`];
    } else {
      const dayMap: Record<string, string> = {
        all: "-100 years",
        "1y": "-1 year",
        "6m": "-6 months",
        "3m": "-3 months",
      };
      sql = `SELECT ${cols}
             FROM portfolio_snapshots
             WHERE user_id = ? AND portfolio_id = ? AND date >= date('now', ?)
             ORDER BY date ASC`;
      args = [session.userId, portfolioId, dayMap[range]];
    }
  } else if (range === "1d") {
    const dateParam = url.searchParams.get("date");
    targetDay1d = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayDateString();
    const td = new Date(targetDay1d + "T00:00:00Z");
    td.setUTCDate(td.getUTCDate() - 1);
    const dayBefore = td.toISOString().slice(0, 10);
    sql = `SELECT ${cols}
           FROM portfolio_snapshots
           WHERE user_id = ? AND portfolio_id = ? AND date >= ? AND date < ?
           ORDER BY date ASC`;
    const nextDay = new Date(targetDay1d + "T00:00:00Z");
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    args = [session.userId, portfolioId, dayBefore, nextDay.toISOString().slice(0, 10)];
  } else if (range === "1w") {
    sql = `SELECT ${cols}
           FROM portfolio_snapshots
           WHERE user_id = ? AND portfolio_id = ? AND date >= date('now', '-7 days')
           ORDER BY date ASC`;
    args = [session.userId, portfolioId];
  } else {
    /* 1m and any unknown range: calendar month window */
    const start = oneCalendarMonthAgoDateString();
    sql = `SELECT ${cols}
           FROM portfolio_snapshots
           WHERE user_id = ? AND portfolio_id = ? AND date >= ?
           ORDER BY date ASC`;
    args = [session.userId, portfolioId, start];
  }

  const effectiveRange = (paidRanges.has(range) && !canViewFull) ? "1m" : range;
  const eventsStartDate = targetDay1d || computeStartDate(effectiveRange);

  /** One row per transaction (all types) for chart markers — capped for very large ledgers. */
  const eventsSql = portfolioId
    ? `SELECT id, type, ticker, name, shares, total_amount, currency,
              substr(date, 1, 10) as event_date
       FROM transactions
       WHERE user_id = ? AND substr(date, 1, 10) >= ? AND portfolio_id = ?
       ORDER BY date ASC, id ASC
       LIMIT 2000`
    : `SELECT id, type, ticker, name, shares, total_amount, currency,
              substr(date, 1, 10) as event_date
       FROM transactions
       WHERE user_id = ? AND substr(date, 1, 10) >= ?
       ORDER BY date ASC, id ASC
       LIMIT 2000`;

  const eventsArgs: (string | number)[] = portfolioId
    ? [session.userId, eventsStartDate, portfolioId]
    : [session.userId, eventsStartDate];

  const [result, eventsResult] = await Promise.all([
    client.execute({ sql, args }),
    client.execute({ sql: eventsSql, args: eventsArgs }),
  ]);

  const allPoints: Point[] = result.rows.map((row) => ({
    date: row.date as string,
    value: row.value as number,
    invested: (row.invested as number) || 0,
    stockValue: (row.stockValue as number) || 0,
    etfValue: (row.etfValue as number) || 0,
    cryptoValue: (row.cryptoValue as number) || 0,
  }));

  // When a date has both a daily backfill snapshot ("2026-03-19") AND intraday
  // live snapshots ("2026-03-19 14:15:00"), drop the daily one — the live
  // snapshots use actual holdings + real-time quotes and are more accurate.
  const datesWithIntraday = new Set<string>();
  for (const p of allPoints) {
    if (p.date.includes(" ") || p.date.includes("T")) {
      datesWithIntraday.add(p.date.slice(0, 10));
    }
  }
  const rawPoints = datesWithIntraday.size > 0
    ? allPoints.filter((p) => {
        const isDaily = !p.date.includes(" ") && !p.date.includes("T");
        return !(isDaily && datesWithIntraday.has(p.date.slice(0, 10)));
      })
    : allPoints;

  const granularity = resolveGranularity(effectiveRange, rawPoints);
  let points = downsample(rawPoints, granularity);

  if ((granularity === "five-minute" || granularity === "hourly") && rawPoints.length >= 1) {
    const windowStartMs = Date.parse(`${eventsStartDate}T00:00:00.000Z`);
    const windowEndMs = targetDay1d
      ? Date.parse(`${targetDay1d}T23:59:59.999Z`)
      : Date.now();
    if (Number.isFinite(windowStartMs)) {
      points = granularity === "five-minute"
        ? densifyFiveMinuteTimeline(rawPoints, windowStartMs, windowEndMs)
        : densifyHourlyTimeline(rawPoints, windowStartMs, windowEndMs);
    }
  }

  const events = eventsResult.rows.map((row) => ({
    id: row.id as string,
    date: row.event_date as string,
    type: row.type as string,
    ticker: ((row.ticker as string) || "").toUpperCase(),
    name: (row.name as string) || ((row.ticker as string) || "").toUpperCase(),
    shares: Number(row.shares) || 0,
    totalAmount: Number(row.total_amount) || 0,
    currency: ((row.currency as string) || "EUR").toUpperCase(),
  }));

  return NextResponse.json({
    points,
    events,
    isPro,
    canViewFull,
  });
});
