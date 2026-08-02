import type {
  DayHighlightAlertInput,
  DayHighlightEventInput,
  DayHighlightHoldingInput,
  DayHighlightNewsInput,
  HomeDayHighlight,
  HomeDayHighlightReason,
} from "./types";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysUntil(dateStr: string, today: string): number | null {
  const a = Date.parse(`${today}T12:00:00Z`);
  const b = Date.parse(`${dateStr.slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function near52w(holding: DayHighlightHoldingInput): HomeDayHighlightReason | null {
  const price = holding.price;
  if (price == null || price <= 0) return null;
  if (holding.fiftyTwoWeekHigh != null && holding.fiftyTwoWeekHigh > 0) {
    const dist = ((holding.fiftyTwoWeekHigh - price) / holding.fiftyTwoWeekHigh) * 100;
    if (dist >= 0 && dist <= 3) {
      return { kind: "near_52w", side: "high", distancePct: Math.round(dist * 10) / 10 };
    }
  }
  if (holding.fiftyTwoWeekLow != null && holding.fiftyTwoWeekLow > 0) {
    const dist = ((price - holding.fiftyTwoWeekLow) / holding.fiftyTwoWeekLow) * 100;
    if (dist >= 0 && dist <= 3) {
      return { kind: "near_52w", side: "low", distancePct: Math.round(dist * 10) / 10 };
    }
  }
  return null;
}

export function scoreDayHighlights(input: {
  holdings: DayHighlightHoldingInput[];
  events?: DayHighlightEventInput[];
  news?: DayHighlightNewsInput[];
  alerts?: DayHighlightAlertInput[];
  today?: string;
  limit?: number;
}): HomeDayHighlight[] {
  const today = input.today ?? ymd(new Date());
  const limit = input.limit ?? 8;
  const events = input.events ?? [];
  const news = input.news ?? [];
  const alerts = input.alerts ?? [];

  const byTicker = new Map<
    string,
    { score: number; reasons: HomeDayHighlightReason[]; absEur: number }
  >();

  const bump = (ticker: string, points: number, reason: HomeDayHighlightReason, absEur = 0) => {
    const key = ticker.toUpperCase();
    const cur = byTicker.get(key) ?? { score: 0, reasons: [], absEur: 0 };
    cur.score += points;
    cur.absEur = Math.max(cur.absEur, absEur);
    if (!cur.reasons.some((r) => r.kind === reason.kind && JSON.stringify(r) === JSON.stringify(reason))) {
      cur.reasons.push(reason);
    }
    byTicker.set(key, cur);
  };

  for (const h of input.holdings) {
    const ticker = h.ticker.toUpperCase();
    const pct = h.changePercent;
    if (pct != null) {
      const abs = Math.abs(pct);
      const eur = h.eurDayImpact ?? 0;
      if (abs >= 5) {
        bump(ticker, 5, { kind: "move", pct, eurImpact: Math.round(eur) }, Math.abs(eur));
      } else if (abs >= 3) {
        bump(ticker, 3.5, { kind: "move", pct, eurImpact: Math.round(eur) }, Math.abs(eur));
      } else if (abs >= 1.5 && Math.abs(eur) >= 200) {
        bump(ticker, 2, { kind: "move", pct, eurImpact: Math.round(eur) }, Math.abs(eur));
      }
    }
    const n52 = near52w(h);
    if (n52) bump(ticker, 2, n52);
  }

  for (const ev of events) {
    if (!ev.ticker) continue;
    const ticker = ev.ticker.toUpperCase();
    const d = daysUntil(ev.date, today);
    if (d == null || d < 0 || d > 14) continue;
    const type = ev.type.toLowerCase();
    if (type.includes("earn")) {
      const when: "today" | "tomorrow" | string =
        d === 0 ? "today" : d === 1 ? "tomorrow" : ev.date.slice(0, 10);
      bump(ticker, d === 0 ? 6 : d === 1 ? 5 : 3, { kind: "earnings", when });
    } else if (type.includes("div") || type.includes("ex_div") || type.includes("ex-div")) {
      bump(ticker, d <= 7 ? 2.5 : 1.5, { kind: "ex_div", date: ev.date.slice(0, 10) });
    }
  }

  for (const n of news) {
    if (!n.ticker || n.impactScore < 3) continue;
    bump(n.ticker.toUpperCase(), 1 + n.impactScore * 0.5, {
      kind: "news",
      headline: n.headline,
      impactScore: n.impactScore,
    });
  }

  for (const a of alerts) {
    if (!a.ticker) continue;
    bump(a.ticker.toUpperCase(), 4, { kind: "alert", label: a.label });
  }

  return [...byTicker.entries()]
    .filter(([, v]) => v.reasons.length > 0)
    .sort((a, b) => {
      if (b[1].score !== a[1].score) return b[1].score - a[1].score;
      return b[1].absEur - a[1].absEur;
    })
    .slice(0, limit)
    .map(([ticker, v], i) => ({
      ticker,
      rank: i + 1,
      score: Math.round(v.score * 10) / 10,
      reasons: v.reasons.slice(0, 4),
    }));
}
