import { randomUUID } from "crypto";
import { ensureInitialized } from "./client";
import { str, num } from "./helpers";

export interface ChannelSpendCap {
  id: string;
  channel: string;
  capAmountEur: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface ChannelSpendEntry {
  id: string;
  channel: string;
  amountEur: number;
  spentOn: string;
  note: string;
  createdAt: string;
}

export interface ChannelSpendSummary {
  channel: string;
  totalSpentEur: number;
  activeCap: ChannelSpendCap | null;
  utilizationPct: number | null;
}

export interface ChannelPerformance {
  channel: string;
  spendEur: number;
  signups: number;
  paywallShown: number;
  paidConversions: number;
  /** null when paidConversions is 0 — commerce_enabled is likely still off. */
  cacEur: number | null;
  spendPerSignupEur: number | null;
  retention7dPct: number | null;
  retention14dPct: number | null;
}

export interface AcquisitionDecisionMemo {
  id: string;
  periodStart: string;
  periodEnd: string;
  decision: "scale" | "iterate" | "stop";
  notes: string;
  nextCycleKpiTargets: string;
  budgetReallocation: string;
  createdBy: string;
  createdAt: string;
}

export async function createSpendCap(input: {
  channel: string;
  capAmountEur: number;
  periodStart: string;
  periodEnd: string;
}): Promise<ChannelSpendCap> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO channel_spend_caps (id, channel, cap_amount_eur, period_start, period_end)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, input.channel, input.capAmountEur, input.periodStart, input.periodEnd],
  });
  const result = await client.execute({
    sql: "SELECT * FROM channel_spend_caps WHERE id = ?",
    args: [id],
  });
  return mapSpendCap(result.rows[0]);
}

export async function listSpendCaps(): Promise<ChannelSpendCap[]> {
  const client = await ensureInitialized();
  const result = await client.execute(
    "SELECT * FROM channel_spend_caps ORDER BY period_start DESC, created_at DESC"
  );
  return result.rows.map(mapSpendCap);
}

export async function addSpendEntry(input: {
  channel: string;
  amountEur: number;
  spentOn: string;
  note?: string;
}): Promise<ChannelSpendEntry> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO channel_spend_entries (id, channel, amount_eur, spent_on, note)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, input.channel, input.amountEur, input.spentOn, input.note ?? ""],
  });
  const result = await client.execute({
    sql: "SELECT * FROM channel_spend_entries WHERE id = ?",
    args: [id],
  });
  return mapSpendEntry(result.rows[0]);
}

export async function listSpendEntries(channel?: string): Promise<ChannelSpendEntry[]> {
  const client = await ensureInitialized();
  const result = channel
    ? await client.execute({
        sql: "SELECT * FROM channel_spend_entries WHERE channel = ? ORDER BY spent_on DESC, created_at DESC",
        args: [channel],
      })
    : await client.execute(
        "SELECT * FROM channel_spend_entries ORDER BY spent_on DESC, created_at DESC"
      );
  return result.rows.map(mapSpendEntry);
}

export async function getSpendSummaryByChannel(): Promise<ChannelSpendSummary[]> {
  const client = await ensureInitialized();
  const [entriesResult, capsResult] = await Promise.all([
    client.execute(
      "SELECT channel, SUM(amount_eur) as total FROM channel_spend_entries GROUP BY channel"
    ),
    client.execute(
      `SELECT * FROM channel_spend_caps
       WHERE date('now') BETWEEN period_start AND period_end
       ORDER BY created_at DESC`
    ),
  ]);

  const totalsByChannel = new Map<string, number>();
  for (const r of entriesResult.rows) {
    totalsByChannel.set(str(r.channel), num(r.total));
  }

  const activeCapsByChannel = new Map<string, ChannelSpendCap>();
  for (const row of capsResult.rows) {
    const cap = mapSpendCap(row);
    if (!activeCapsByChannel.has(cap.channel)) {
      activeCapsByChannel.set(cap.channel, cap);
    }
  }

  const channels = new Set([...totalsByChannel.keys(), ...activeCapsByChannel.keys()]);
  return Array.from(channels).map((channel) => {
    const totalSpentEur = totalsByChannel.get(channel) ?? 0;
    const activeCap = activeCapsByChannel.get(channel) ?? null;
    return {
      channel,
      totalSpentEur,
      activeCap,
      utilizationPct: activeCap && activeCap.capAmountEur > 0
        ? Number(((totalSpentEur / activeCap.capAmountEur) * 100).toFixed(1))
        : null,
    };
  });
}

/**
 * Per-channel CAC and cohort retention for the acquisition experiment.
 * Retention uses analytics_events activity within [signup+7d, signup+14d]
 * (and [+14d, +21d]) per user — not users.last_active_at, which only holds
 * current state and would misreport a since-reactivated user as "retained"
 * in every historical window.
 */
export async function getChannelPerformance(days: number): Promise<ChannelPerformance[]> {
  const client = await ensureInitialized();
  const daysArg = `-${days} days`;

  const [signupsAndConversions, spendByChannel, retention7d, retention14d] = await Promise.all([
    client.execute({
      sql: `SELECT
              CASE WHEN u.utm_source IS NULL OR TRIM(u.utm_source) = '' THEN 'unknown' ELSE LOWER(TRIM(u.utm_source)) END AS channel,
              COUNT(*) AS signups,
              COUNT(DISTINCT CASE WHEN pw.user_id IS NOT NULL THEN u.id END) AS paywall_shown,
              COUNT(DISTINCT CASE WHEN ae.user_id IS NOT NULL THEN u.id END) AS paid_conversions
            FROM users u
            LEFT JOIN analytics_events pw
              ON pw.user_id = u.id AND pw.event = 'paywall_shown' AND pw.created_at >= datetime('now', ?)
            LEFT JOIN analytics_events ae
              ON ae.user_id = u.id AND ae.event = 'billing_checkout_completed' AND ae.created_at >= datetime('now', ?)
            WHERE u.created_at >= datetime('now', ?)
            GROUP BY channel`,
      args: [daysArg, daysArg, daysArg],
    }),
    client.execute("SELECT channel, SUM(amount_eur) as total FROM channel_spend_entries GROUP BY channel"),
    client.execute({
      sql: `SELECT
              CASE WHEN u.utm_source IS NULL OR TRIM(u.utm_source) = '' THEN 'unknown' ELSE LOWER(TRIM(u.utm_source)) END AS channel,
              COUNT(DISTINCT u.id) AS retained
            FROM users u
            JOIN analytics_events ae
              ON ae.user_id = u.id
             AND ae.created_at >= datetime(u.created_at, '+7 days')
             AND ae.created_at <  datetime(u.created_at, '+14 days')
            WHERE u.created_at >= datetime('now', ?)
              AND u.created_at <= datetime('now', '-14 days')
            GROUP BY channel`,
      args: [daysArg],
    }),
    client.execute({
      sql: `SELECT
              CASE WHEN u.utm_source IS NULL OR TRIM(u.utm_source) = '' THEN 'unknown' ELSE LOWER(TRIM(u.utm_source)) END AS channel,
              COUNT(DISTINCT u.id) AS retained
            FROM users u
            JOIN analytics_events ae
              ON ae.user_id = u.id
             AND ae.created_at >= datetime(u.created_at, '+14 days')
             AND ae.created_at <  datetime(u.created_at, '+21 days')
            WHERE u.created_at >= datetime('now', ?)
              AND u.created_at <= datetime('now', '-21 days')
            GROUP BY channel`,
      args: [daysArg],
    }),
  ]);

  const cohortSizeResult = await client.execute({
    sql: `SELECT
            CASE WHEN utm_source IS NULL OR TRIM(utm_source) = '' THEN 'unknown' ELSE LOWER(TRIM(utm_source)) END AS channel,
            COUNT(*) AS cnt
          FROM users
          WHERE created_at >= datetime('now', ?) AND created_at <= datetime('now', '-14 days')
          GROUP BY channel`,
    args: [daysArg],
  });
  const cohortSizeResult21 = await client.execute({
    sql: `SELECT
            CASE WHEN utm_source IS NULL OR TRIM(utm_source) = '' THEN 'unknown' ELSE LOWER(TRIM(utm_source)) END AS channel,
            COUNT(*) AS cnt
          FROM users
          WHERE created_at >= datetime('now', ?) AND created_at <= datetime('now', '-21 days')
          GROUP BY channel`,
    args: [daysArg],
  });

  const spendMap = new Map<string, number>();
  for (const r of spendByChannel.rows) spendMap.set(str(r.channel), num(r.total));

  const retained7Map = new Map<string, number>();
  for (const r of retention7d.rows) retained7Map.set(str(r.channel), num(r.retained));
  const cohort7Map = new Map<string, number>();
  for (const r of cohortSizeResult.rows) cohort7Map.set(str(r.channel), num(r.cnt));

  const retained14Map = new Map<string, number>();
  for (const r of retention14d.rows) retained14Map.set(str(r.channel), num(r.retained));
  const cohort14Map = new Map<string, number>();
  for (const r of cohortSizeResult21.rows) cohort14Map.set(str(r.channel), num(r.cnt));

  return signupsAndConversions.rows.map((r) => {
    const channel = str(r.channel);
    const signups = num(r.signups);
    const paywallShown = num(r.paywall_shown);
    const paidConversions = num(r.paid_conversions);
    const spendEur = spendMap.get(channel) ?? 0;

    const cohort7 = cohort7Map.get(channel) ?? 0;
    const retained7 = retained7Map.get(channel) ?? 0;
    const cohort14 = cohort14Map.get(channel) ?? 0;
    const retained14 = retained14Map.get(channel) ?? 0;

    return {
      channel,
      spendEur,
      signups,
      paywallShown,
      paidConversions,
      cacEur: paidConversions > 0 ? Number((spendEur / paidConversions).toFixed(2)) : null,
      spendPerSignupEur: signups > 0 ? Number((spendEur / signups).toFixed(2)) : null,
      retention7dPct: cohort7 > 0 ? Number(((retained7 / cohort7) * 100).toFixed(1)) : null,
      retention14dPct: cohort14 > 0 ? Number(((retained14 / cohort14) * 100).toFixed(1)) : null,
    };
  });
}

export async function createDecisionMemo(input: {
  periodStart: string;
  periodEnd: string;
  decision: "scale" | "iterate" | "stop";
  notes?: string;
  nextCycleKpiTargets?: string;
  budgetReallocation?: string;
  createdBy: string;
}): Promise<AcquisitionDecisionMemo> {
  const client = await ensureInitialized();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO acquisition_decision_memos
            (id, period_start, period_end, decision, notes, next_cycle_kpi_targets, budget_reallocation, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.periodStart,
      input.periodEnd,
      input.decision,
      input.notes ?? "",
      input.nextCycleKpiTargets ?? "",
      input.budgetReallocation ?? "",
      input.createdBy,
    ],
  });
  const result = await client.execute({
    sql: "SELECT * FROM acquisition_decision_memos WHERE id = ?",
    args: [id],
  });
  return mapDecisionMemo(result.rows[0]);
}

export async function listDecisionMemos(): Promise<AcquisitionDecisionMemo[]> {
  const client = await ensureInitialized();
  const result = await client.execute(
    "SELECT * FROM acquisition_decision_memos ORDER BY period_start DESC, created_at DESC"
  );
  return result.rows.map(mapDecisionMemo);
}

function mapSpendCap(row: Record<string, unknown>): ChannelSpendCap {
  return {
    id: str(row.id),
    channel: str(row.channel),
    capAmountEur: num(row.cap_amount_eur),
    periodStart: str(row.period_start),
    periodEnd: str(row.period_end),
    createdAt: str(row.created_at),
  };
}

function mapSpendEntry(row: Record<string, unknown>): ChannelSpendEntry {
  return {
    id: str(row.id),
    channel: str(row.channel),
    amountEur: num(row.amount_eur),
    spentOn: str(row.spent_on),
    note: str(row.note),
    createdAt: str(row.created_at),
  };
}

function mapDecisionMemo(row: Record<string, unknown>): AcquisitionDecisionMemo {
  return {
    id: str(row.id),
    periodStart: str(row.period_start),
    periodEnd: str(row.period_end),
    decision: str(row.decision) as "scale" | "iterate" | "stop",
    notes: str(row.notes),
    nextCycleKpiTargets: str(row.next_cycle_kpi_targets),
    budgetReallocation: str(row.budget_reallocation),
    createdBy: str(row.created_by),
    createdAt: str(row.created_at),
  };
}
