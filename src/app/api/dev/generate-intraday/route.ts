import { NextRequest, NextResponse } from "next/server";
import { ensureInitialized } from "@/lib/db/client";
import { requireSession } from "@/lib/auth/guards";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * DEV-ONLY: Generate synthetic intraday snapshots for testing the 1D chart.
 *
 * Reads yesterday's last snapshot + today's latest real snapshot, then fills
 * 5-minute intervals from midnight to now with market-aware interpolation:
 *   - Stocks/ETFs: flat before market open, gradual variation during market hours
 *   - Crypto: 24/7 smooth variation with sinusoidal noise
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const { session, error } = await requireSession(req);
  if (error || !session) return error!;

  const client = await ensureInitialized();
  const userId = session.userId;

  const portfolioIds = await client.execute({
    sql: `SELECT DISTINCT portfolio_id FROM portfolio_snapshots WHERE user_id = ?`,
    args: [userId],
  });
  const pIds = portfolioIds.rows.map((r) => r.portfolio_id as string);

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let generated = 0;

  for (const portfolioId of pIds) {
    const yesterdaySnap = await client.execute({
      sql: `SELECT total_value_eur, total_invested_eur, stock_value_eur, etf_value_eur, crypto_value_eur
            FROM portfolio_snapshots
            WHERE user_id = ? AND portfolio_id = ? AND date >= ? AND date < ?
            ORDER BY date DESC LIMIT 1`,
      args: [userId, portfolioId, yesterday, today],
    });

    const todaySnap = await client.execute({
      sql: `SELECT total_value_eur, total_invested_eur, stock_value_eur, etf_value_eur, crypto_value_eur, date
            FROM portfolio_snapshots
            WHERE user_id = ? AND portfolio_id = ? AND date >= ?
            ORDER BY date DESC LIMIT 1`,
      args: [userId, portfolioId, today],
    });

    if (yesterdaySnap.rows.length === 0 && todaySnap.rows.length === 0) continue;

    const src = yesterdaySnap.rows[0] ?? todaySnap.rows[0];
    const dst = todaySnap.rows[0] ?? yesterdaySnap.rows[0];

    const startVal = Number(src.total_value_eur) || 0;
    const startInv = Number(src.total_invested_eur) || 0;
    const startStk = Number(src.stock_value_eur) || 0;
    const startEtf = Number(src.etf_value_eur) || 0;
    const startCry = Number(src.crypto_value_eur) || 0;

    const endVal = Number(dst.total_value_eur) || 0;
    const endInv = Number(dst.total_invested_eur) || 0;
    const endStk = Number(dst.stock_value_eur) || 0;
    const endEtf = Number(dst.etf_value_eur) || 0;
    const endCry = Number(dst.crypto_value_eur) || 0;

    const nowMs = Date.now();
    const midnightMs = Date.parse(`${today}T00:00:00.000Z`);
    const FIVE_MIN = 5 * 60 * 1000;

    const XETRA_OPEN_H = 8;
    const NYSE_OPEN_H = 14.5;
    const NYSE_CLOSE_H = 21;

    // Seed a deterministic pseudo-random for reproducible noise
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed / 2147483647) - 0.5; // range -0.5..+0.5
    };

    const stmts: { sql: string; args: (string | number)[] }[] = [];

    for (let t = midnightMs; t <= nowMs; t += FIVE_MIN) {
      const d = new Date(t);
      const hh = d.getUTCHours() + d.getUTCMinutes() / 60;
      const dayRatio = (t - midnightMs) / (nowMs - midnightMs || 1);
      const dateBucket =
        d.getUTCFullYear() +
        "-" + String(d.getUTCMonth() + 1).padStart(2, "0") +
        "-" + String(d.getUTCDate()).padStart(2, "0") +
        " " + String(d.getUTCHours()).padStart(2, "0") +
        ":" + String(d.getUTCMinutes()).padStart(2, "0") +
        ":00";

      // --- Stocks: flat until XETRA open, then ramp to end value ---
      let stkRatio = 0;
      if (hh >= NYSE_CLOSE_H) {
        stkRatio = 1;
      } else if (hh >= XETRA_OPEN_H) {
        stkRatio = (hh - XETRA_OPEN_H) / (NYSE_CLOSE_H - XETRA_OPEN_H);
      }
      const stkNoise = rand() * 0.002 * startStk * (stkRatio > 0 ? 1 : 0);
      const stk = startStk + (endStk - startStk) * stkRatio + stkNoise;

      // --- ETFs: same market hours as stocks ---
      const etfRatio = stkRatio;
      const etfNoise = rand() * 0.001 * startEtf * (etfRatio > 0 ? 1 : 0);
      const etf = startEtf + (endEtf - startEtf) * etfRatio + etfNoise;

      // --- Crypto: smooth 24/7 with sinusoidal noise ---
      const cryBase = startCry + (endCry - startCry) * dayRatio;
      const cryAmplitude = Math.abs(endCry - startCry) * 0.08;
      const cryWave = Math.sin(dayRatio * Math.PI * 6) * cryAmplitude;
      const cryNoise = rand() * cryAmplitude * 0.5;
      const cry = cryBase + cryWave + cryNoise;

      const val = stk + etf + cry;
      const inv = startInv + (endInv - startInv) * dayRatio;

      stmts.push({
        sql: `INSERT INTO portfolio_snapshots (id, user_id, portfolio_id, date, total_value_eur, total_invested_eur, stock_value_eur, etf_value_eur, crypto_value_eur)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id, portfolio_id, date) DO UPDATE SET
                total_value_eur = excluded.total_value_eur,
                total_invested_eur = excluded.total_invested_eur,
                stock_value_eur = excluded.stock_value_eur,
                etf_value_eur = excluded.etf_value_eur,
                crypto_value_eur = excluded.crypto_value_eur`,
        args: [
          generateId(), userId, portfolioId, dateBucket,
          Math.round(val * 100) / 100,
          Math.round(inv * 100) / 100,
          Math.round(stk * 100) / 100,
          Math.round(etf * 100) / 100,
          Math.round(cry * 100) / 100,
        ],
      });
    }

    const BATCH = 50;
    for (let i = 0; i < stmts.length; i += BATCH) {
      await client.batch(stmts.slice(i, i + BATCH), "write");
    }
    generated += stmts.length;
  }

  return NextResponse.json({ ok: true, generated, portfolios: pIds.length });
}
